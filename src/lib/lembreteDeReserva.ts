import { criarClienteAdmin } from "@/lib/supabase/admin";
import { agoraEmSaoPaulo, passouDoCutoff } from "@/lib/reservas";
import { hojeEmSaoPauloISO } from "@/lib/datas";
import { enviarTextoPelaApiDaSendPulse } from "@/lib/sendpulseApi";
import { enviarMensagemDirect } from "@/lib/metaMessaging";

// Lembrete de comparecimento: mensagem automática no Instagram, uma vez por dia, pra todo mundo
// que confirmou reserva pra HOJE — chamado pelo cron (ver src/app/api/cron/lembrete-reservas/
// route.ts e vercel.json), nunca pelo fluxo de conversa em si. Cada conta liga/configura isso
// separadamente em /contas/[id]/reserva (reserva_lembrete_* em chatbot_account_settings).

type Admin = ReturnType<typeof criarClienteAdmin>;

export const MENSAGEM_LEMBRETE_PADRAO =
  "Oii, você tem uma reserva confirmada na esquina mais charmosa da cidade hoje! Passando pra te lembrar que o horário de chegada é até as 19h! Bom apetite e Aproveite a casa! ❤️ Estamos esperando você!";

export const HORARIO_LEMBRETE_PADRAO = "18:40";

type ResultadoDoLembrete = {
  contaId: string;
  enviadas: number;
  puladas: number;
  falhas: number;
};

/** Manda o lembrete pra quem tem reserva hoje NESSA conta — uma mensagem por pessoa (não por
 * reserva: quem fez duas reservas pro mesmo dia recebe só uma). `manual:` (reserva cadastrada à
 * mão, sem contato de Instagram de verdade) é sempre pulada — não tem como mandar DM sem um
 * contato de Instagram por trás. */
async function enviarLembretesDaConta(
  admin: Admin,
  conta: { id: string; access_token: string | null },
  mensagem: string
): Promise<ResultadoDoLembrete> {
  const hoje = hojeEmSaoPauloISO();
  const resultado: ResultadoDoLembrete = { contaId: conta.id, enviadas: 0, puladas: 0, falhas: 0 };

  const { data: reservas } = await admin
    .from("chatbot_reservations")
    .select("instagram_scoped_id")
    .eq("account_id", conta.id)
    .eq("data_reserva", hoje);

  if (!reservas || reservas.length === 0) return resultado;

  const idsUnicos = Array.from(new Set(reservas.map((r) => r.instagram_scoped_id).filter(Boolean)));

  for (const id of idsUnicos) {
    try {
      if (id.startsWith("sendpulse:")) {
        await enviarTextoPelaApiDaSendPulse(id.slice("sendpulse:".length), mensagem);
        resultado.enviadas++;
      } else if (id.startsWith("manual:")) {
        resultado.puladas++;
      } else if (conta.access_token) {
        await enviarMensagemDirect(conta.access_token, id, mensagem);
        resultado.enviadas++;
      } else {
        resultado.puladas++;
      }
    } catch (erro) {
      console.error(`Falha ao mandar lembrete de reserva pra ${id} (conta ${conta.id}):`, erro);
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
    .select(
      "account_id, reserva_lembrete_horario, reserva_lembrete_mensagem, reserva_lembrete_ultima_data_enviada"
    )
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
    .select("id, access_token")
    .in(
      "id",
      pendentes.map((s) => s.account_id)
    );
  const contaPorId = new Map((contas ?? []).map((c) => [c.id, c]));

  const resultados: ResultadoDoLembrete[] = [];
  for (const s of pendentes) {
    const conta = contaPorId.get(s.account_id);
    if (!conta) continue;

    const mensagem = s.reserva_lembrete_mensagem?.trim() || MENSAGEM_LEMBRETE_PADRAO;
    resultados.push(await enviarLembretesDaConta(admin, conta, mensagem));

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
