import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarMensagemDirect } from "@/lib/metaMessaging";
import { gerarRespostaComGemini } from "@/lib/gemini";
import { processarMensagemDeReserva } from "@/lib/reservas";
import { agruparMensagensRapidas } from "@/lib/debounce";
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
      // Espera um pouquinho pra ver se a mesma pessoa vai completar o pensamento numa segunda
      // mensagem antes de responder (reportado em teste real: "Talvez ao invés de 8 pessoas, serão
      // 9" seguido de "Tem problema?" — cada uma respondida separadamente, como perguntas sem
      // relação nenhuma). Um `null` aqui significa que já existe mensagem mais nova da mesma
      // pessoa esperando na fila — quem responde por tudo é aquela chamada, então essa aqui não
      // faz nada.
      const textoAgrupado = await agruparMensagensRapidas(admin, conta.id, idDoCliente, textoDaMensagem);

      if (textoAgrupado === null) {
        tipoResposta = "sem_resposta";
      } else {
        const { data: palavrasChave, error: erroAoBuscarPalavrasChave } = await admin
          .from("chatbot_keywords")
          .select("palavra_chave, mensagens, pausa_entre_mensagens_ms")
          .eq("account_id", conta.id)
          .eq("ativo", true)
          .order("created_at", { ascending: true });

        if (erroAoBuscarPalavrasChave) throw erroAoBuscarPalavrasChave;

        const textoNormalizado = normalizar(textoAgrupado);

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
          const respostaGemini = await responderComGemini(admin, conta, idDoCliente, textoAgrupado);

          if (respostaGemini) {
            tipoResposta = "gemini";
            respostaResumo = respostaGemini;
          } else {
            tipoResposta = "sem_resposta";
          }
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
    .select("tom_de_voz, guardrails, base_conhecimento, palavra_chave_reserva, reserva_habilitada")
    .eq("account_id", conta.id)
    .maybeSingle();

  if (erroAoBuscarConfig) throw erroAoBuscarConfig;

  if (!config) {
    // Conta ainda sem configuração de Gemini cadastrada — fica em silêncio.
    return null;
  }

  // Chegou até aqui porque processarMensagemDeReserva (chamado ANTES do Gemini, em
  // decidirEResponder) já checou e não bateu a palavra-chave de reserva — ou seja, quem cuida de
  // reserva é aquele fluxo dedicado, nunca o Gemini. Sem essa instrução o Gemini, não sabendo que
  // esse fluxo existe, respondia coisas como "não fazemos reservas por aqui" (reportado em teste
  // real), quando na verdade só falta a pessoa usar a palavra certa pra o fluxo começar.
  const primeiraVariacaoDaPalavraChaveDeReserva = config.reserva_habilitada
    ? (config.palavra_chave_reserva ?? "")
        .split(",")
        .map((v: string) => v.trim())
        .find((v: string) => v.length > 0)
    : null;

  const promptBaseDoSistema = [
    config.tom_de_voz ? `Tom de voz a seguir:\n${config.tom_de_voz}` : null,
    config.guardrails ? `Regras que você DEVE seguir sempre:\n${config.guardrails}` : null,
    config.base_conhecimento ? `Informações sobre o negócio:\n${config.base_conhecimento}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!promptBaseDoSistema) {
    // Conta sem NENHUMA configuração de Gemini preenchida ainda — continua em silêncio, mesmo que
    // reserva esteja ativada (a instrução de reserva abaixo só faz sentido complementando um
    // prompt que a conta já configurou de propósito).
    return null;
  }

  const instrucaoSobreReserva = primeiraVariacaoDaPalavraChaveDeReserva
    ? `Reservas NÃO são feitas por você — existe um fluxo automático separado, dedicado só a isso, que começa assim que a pessoa escrever a palavra "${primeiraVariacaoDaPalavraChaveDeReserva}" (ou fizer um pedido claro de reserva). Nunca diga que "não fazemos reservas", que reserva "não é possível por aqui" ou qualquer coisa parecida — se o assunto for reserva, apenas oriente a pessoa a dizer que quer fazer uma reserva (ou usar a palavra "${primeiraVariacaoDaPalavraChaveDeReserva}") para o fluxo de reserva começar.`
    : null;

  const promptDoSistema = [promptBaseDoSistema, instrucaoSobreReserva].filter(Boolean).join("\n\n");

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
