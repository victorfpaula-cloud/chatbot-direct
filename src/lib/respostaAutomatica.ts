import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarMensagemDirect } from "@/lib/metaMessaging";
import { gerarRespostaComGemini } from "@/lib/gemini";
import { processarMensagemDeReserva } from "@/lib/reservas";
import type { TipoRespostaAtendimento } from "@/lib/atendimentos";

type Admin = ReturnType<typeof criarClienteAdmin>;
type Conta = { id: string; access_token: string };
type Mensagem = { text?: string; quick_reply?: { payload: string } };

/**
 * Decide como responder a UMA mensagem recebida (reserva → palavra-chave → Gemini, nessa ordem —
 * ver comentário em processarMensagemDeReserva sobre por que a reserva vem antes) e já dispara o
 * envio de cada uma através de `enviarMensagemDirect`/`enviarMensagemComBotoes`. Compartilhada
 * pelo webhook direto da Meta (src/app/api/webhook/instagram/route.ts) e pela ponte do SendPulse
 * (src/app/api/bridge/sendpulse/route.ts) — o envio de verdade ou a coleta pra ponte é decidida
 * dentro de metaMessaging.ts, não aqui.
 */
export async function decidirEResponder(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  mensagem: Mensagem
): Promise<{
  tipoResposta: TipoRespostaAtendimento;
  respostaResumo: string | null;
  erroOcorrido: unknown;
}> {
  const textoDaMensagem = mensagem.text;

  let tipoResposta: TipoRespostaAtendimento = "sem_resposta";
  let respostaResumo: string | null = null;
  let erroOcorrido: unknown = null;

  try {
    const tratadoPeloFluxoDeReserva = await processarMensagemDeReserva(admin, conta, idDoCliente, mensagem);

    if (tratadoPeloFluxoDeReserva) {
      tipoResposta = "reserva";
      respostaResumo = "Tratado pelo fluxo de reserva (mensagens configuradas na aba Reserva).";
    } else if (textoDaMensagem) {
      const { data: palavrasChave, error: erroAoBuscarPalavrasChave } = await admin
        .from("chatbot_keywords")
        .select("palavra_chave, mensagens, pausa_entre_mensagens_ms")
        .eq("account_id", conta.id)
        .eq("ativo", true)
        .order("created_at", { ascending: true });

      if (erroAoBuscarPalavrasChave) throw erroAoBuscarPalavrasChave;

      const textoNormalizado = normalizar(textoDaMensagem);

      const palavraChaveCorrespondente = (palavrasChave ?? []).find((pc) => {
        const variacoes = (pc.palavra_chave ?? "")
          .split(",")
          .map((v: string) => normalizar(v.trim()))
          .filter((v: string) => v.length > 0);

        return variacoes.some((variacao: string) => textoNormalizado.includes(variacao));
      });

      if (palavraChaveCorrespondente) {
        const mensagensDaSequencia: string[] = Array.isArray(palavraChaveCorrespondente.mensagens)
          ? palavraChaveCorrespondente.mensagens
          : [];
        const pausaMs = Math.min(palavraChaveCorrespondente.pausa_entre_mensagens_ms ?? 0, 4000);

        for (let i = 0; i < mensagensDaSequencia.length; i++) {
          if (i > 0 && pausaMs > 0) {
            await aguardar(pausaMs);
          }
          await enviarMensagemDirect(conta.access_token, idDoCliente, mensagensDaSequencia[i]);
        }

        tipoResposta = "palavra_chave";
        respostaResumo = mensagensDaSequencia.join(" | ") || null;
      } else {
        const respostaGemini = await responderComGemini(admin, conta, idDoCliente, textoDaMensagem);

        if (respostaGemini) {
          tipoResposta = "gemini";
          respostaResumo = respostaGemini;
        } else {
          tipoResposta = "sem_resposta";
        }
      }
    } else {
      tipoResposta = "sem_resposta";
    }
  } catch (erro) {
    erroOcorrido = erro;
  }

  return { tipoResposta, respostaResumo, erroOcorrido };
}

async function responderComGemini(
  admin: Admin,
  conta: Conta,
  idDoCliente: string,
  textoDaMensagem: string
): Promise<string | null> {
  const { data: config, error: erroAoBuscarConfig } = await admin
    .from("chatbot_account_settings")
    .select("tom_de_voz, guardrails, base_conhecimento")
    .eq("account_id", conta.id)
    .maybeSingle();

  if (erroAoBuscarConfig) throw erroAoBuscarConfig;

  if (!config) {
    // Conta ainda sem configuração de Gemini cadastrada — fica em silêncio.
    return null;
  }

  const promptDoSistema = [
    config.tom_de_voz ? `Tom de voz a seguir:\n${config.tom_de_voz}` : null,
    config.guardrails ? `Regras que você DEVE seguir sempre:\n${config.guardrails}` : null,
    config.base_conhecimento ? `Informações sobre o negócio:\n${config.base_conhecimento}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!promptDoSistema) {
    return null;
  }

  const respostaGerada = await gerarRespostaComGemini(promptDoSistema, textoDaMensagem);

  if (!respostaGerada) {
    return null;
  }

  await enviarMensagemDirect(conta.access_token, idDoCliente, respostaGerada);

  return respostaGerada;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
