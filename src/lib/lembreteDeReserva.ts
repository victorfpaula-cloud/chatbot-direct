import { criarClienteAdmin } from "@/lib/supabase/admin";
import { agoraEmSaoPaulo, passouDoCutoff } from "@/lib/reservas";
import { hojeEmSaoPauloISO } from "@/lib/datas";
import { enviarWhatsAppTemplate } from "@/lib/kapsoApi";

// Lembrete de comparecimento: mensagem automática por WhatsApp, uma vez por dia, pra todo mundo
// que confirmou reserva pra HOJE — chamado pelo cron (ver src/app/api/cron/lembrete-reservas/
// route.ts e vercel.json), nunca pelo fluxo de conversa em si. Cada conta liga/configura isso
// separadamente em /contas/[id]/reserva (reserva_lembrete_* em chatbot_account_settings).
//
// Até 22/09/2026 isso mandava por Instagram Direct e pulava quem reservou pelo link público
// (instagram_scoped_id "externo:...", sem conversa nenhuma por trás) ou à mão ("manual:..."). Foi
// pro WhatsApp exatamente pra cobrir esses dois casos também — todo mundo que reserva, por
// Instagram ou pelo link, já deixa o WhatsApp na mesma etapa da conversa (ver
// finalizarReserva/continuarFluxo em reservas.ts), então esse campo sozinho já basta, sem precisar
// mais olhar pra instagram_scoped_id aqui.
//
// Mensagem por template aprovado (Meta exige isso pra qualquer mensagem que o sistema inicia, fora
// da janela de 24h de uma conversa) — por isso não dá mais pra cada conta escrever um texto livre
// customizado (reserva_lembrete_mensagem foi removido da tela de configuração): o texto do template
// é fixo e igual pra todo mundo, só o nome do cliente e o nome do restaurante mudam.

type Admin = ReturnType<typeof criarClienteAdmin>;

export const HORARIO_LEMBRETE_PADRAO = "18:40";

const TEMPLATE_LEMBRETE = "lembrete_reserva";
const IDIOMA_TEMPLATE = "pt_BR";

type ResultadoDoLembrete = {
  contaId: string;
  enviadas: number;
  puladas: number;
  falhas: number;
};

/** Manda o lembrete pra quem tem reserva hoje NESSA conta — uma mensagem por WhatsApp único (quem
 * fez duas reservas pro mesmo dia recebe só uma). Sem WhatsApp cadastrado na reserva, pula (não
 * acontece na prática — o campo é obrigatório em toda etapa de reserva — mas cobre reserva antiga
 * migrada de outro sistema, sem esse dado). */
async function enviarLembretesDaConta(
  admin: Admin,
  conta: { id: string; page_name: string | null }
): Promise<ResultadoDoLembrete> {
  const hoje = hojeEmSaoPauloISO();
  const resultado: ResultadoDoLembrete = { contaId: conta.id, enviadas: 0, puladas: 0, falhas: 0 };

  const { data: reservas } = await admin
    .from("chatbot_reservations")
    .select("cliente_nome, whatsapp")
    .eq("account_id", conta.id)
    .eq("data_reserva", hoje);

  if (!reservas || reservas.length === 0) return resultado;

  const nomeDoRestaurante = conta.page_name?.trim() || "AutoMesa";
  const vistos = new Set<string>();

  for (const reserva of reservas) {
    const numero = reserva.whatsapp?.trim();
    if (!numero) {
      resultado.puladas++;
      continue;
    }

    const chave = numero.replace(/\D/g, "");
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    try {
      const primeiroNome = reserva.cliente_nome?.trim().split(/\s+/)[0] || "";
      const enviou = await enviarWhatsAppTemplate(numero, TEMPLATE_LEMBRETE, IDIOMA_TEMPLATE, [
        primeiroNome,
        nomeDoRestaurante,
      ]);
      if (enviou) {
        resultado.enviadas++;
      } else {
        resultado.falhas++;
      }
    } catch (erro) {
      console.error(`Falha ao mandar lembrete de reserva pro WhatsApp ${numero} (conta ${conta.id}):`, erro);
      resultado.falhas++;
    }
  }

  return resultado;
}

/** Roda em toda chamada do cron: acha as contas cujo horário configurado já passou HOJE e que
 * ainda não receberam o lembrete hoje, manda pra cada uma, e marca a data — assim não importa a
 * frequência exata do cron (a cada 10min, 15min...), o lembrete sai uma vez só, no primeiro run
 * em ou depois do horário configurado, nunca de novo no mesmo dia. */
export async function processarLembretesDeReserva(admin: Admin): Promise<ResultadoDoLembrete[]> {
  const agora = agoraEmSaoPaulo();
  const hoje = hojeEmSaoPauloISO();

  const { data: settings } = await admin
    .from("chatbot_account_settings")
    .select("account_id, reserva_lembrete_horario, reserva_lembrete_ultima_data_enviada")
    .eq("reserva_habilitada", true)
    .eq("reserva_lembrete_habilitado", true);

  const pendentes = (settings ?? []).filter((s) => {
    if (s.reserva_lembrete_ultima_data_enviada === hoje) return false;
    const horario = s.reserva_lembrete_horario?.slice(0, 5) || HORARIO_LEMBRETE_PADRAO;
    return passouDoCutoff(horario, agora.hora, agora.minuto);
  });

  if (pendentes.length === 0) return [];

  const { data: contas } = await admin
    .from("chatbot_accounts")
    .select("id, page_name")
    .in(
      "id",
      pendentes.map((s) => s.account_id)
    );
  const contaPorId = new Map((contas ?? []).map((c) => [c.id, c]));

  const resultados: ResultadoDoLembrete[] = [];
  for (const s of pendentes) {
    const conta = contaPorId.get(s.account_id);
    if (!conta) continue;

    resultados.push(await enviarLembretesDaConta(admin, conta));

    // Marca como enviado hoje mesmo se alguma mensagem individual falhou — senão o cron tentaria
    // de novo a cada execução pelo resto do dia, reenviando pra quem já recebeu só porque UM
    // cliente deu erro.
    await admin
      .from("chatbot_account_settings")
      .update({ reserva_lembrete_ultima_data_enviada: hoje })
      .eq("account_id", s.account_id);
  }

  return resultados;
}
