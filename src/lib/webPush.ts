import webpush from "web-push";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { hojeEmSaoPauloISO } from "@/lib/datas";

type Admin = ReturnType<typeof criarClienteAdmin>;

let configurado = false;

function garantirConfigurado(): boolean {
  if (configurado) return true;

  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chavePrivada = process.env.VAPID_PRIVATE_KEY;
  if (!chavePublica || !chavePrivada) {
    console.error("Push não configurado — faltam NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.");
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@example.com",
    chavePublica,
    chavePrivada
  );
  configurado = true;
  return true;
}

async function contarReservasDeHoje(admin: Admin, accountId: string): Promise<number> {
  const { count } = await admin
    .from("chatbot_reservations")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("data_reserva", hojeEmSaoPauloISO());

  return count ?? 0;
}

/**
 * Manda o mesmo payload pra todo mundo que ativou "Notificações" nessa conta. Nunca lança erro pra
 * quem chama — uma falha aqui não pode impedir a reserva em si de ser confirmada.
 */
async function enviarPushParaConta(admin: Admin, accountId: string, payloadObjeto: Record<string, unknown>): Promise<void> {
  if (!garantirConfigurado()) return;

  try {
    const { data: inscricoes } = await admin
      .from("chatbot_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("account_id", accountId);

    if (!inscricoes || inscricoes.length === 0) return;

    const payload = JSON.stringify(payloadObjeto);

    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
            payload
          );
        } catch (erro: unknown) {
          const status = (erro as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            // Inscrição expirada/removida do lado do navegador — limpa daqui também, senão fica
            // tentando mandar pra um endereço morto pra sempre.
            await admin.from("chatbot_push_subscriptions").delete().eq("id", inscricao.id);
          } else {
            console.error("Falha ao enviar notificação push:", erro);
          }
        }
      })
    );
  } catch (erro) {
    console.error("Falha ao processar notificações push:", erro);
  }
}

/**
 * Chamada em toda reserva nova confirmada (finalizarReserva, em reservas.ts). Primeiro nome +
 * data (não a quantidade de pessoas nem o @usuário) — o suficiente pra reconhecer de cara "quem"
 * e "quando" na tela de bloqueio, sem virar um textão; quem quiser o resto abre o app.
 */
export async function notificarNovaReserva(
  admin: Admin,
  accountId: string,
  nomeCliente: string | null,
  dataReservaBR: string | null
): Promise<void> {
  const totalHoje = await contarReservasDeHoje(admin, accountId);
  const primeiroNome = nomeCliente?.trim().split(/\s+/)[0] || "Cliente";
  // dataReservaBR vem como "DD/MM/AAAA" (formatarDataBR, em reservas.ts) — só dia/mês aqui.
  const dataCurta = dataReservaBR?.slice(0, 5);
  const corpo = dataCurta ? `${primeiroNome} - ${dataCurta}` : primeiroNome;

  await enviarPushParaConta(admin, accountId, {
    titulo: "Nova Reserva! ☑️",
    corpo,
    badge: totalHoje,
    url: "/reservas",
  });
}

/**
 * Chamada quando uma reserva confirmada faz a soma de pessoas daquele dia+período bater (ou
 * passar) o limite máximo configurado — ou seja, é a própria reserva que "lotou" a casa. Dispara
 * uma vez só: as tentativas seguintes pra esse mesmo dia+período já são recusadas antes de chegar
 * nesse ponto do código (ver finalizarReserva), então esse aviso nunca se repete à toa.
 */
export async function notificarLotacaoAtingida(admin: Admin, accountId: string, periodoTexto: string): Promise<void> {
  const totalHoje = await contarReservasDeHoje(admin, accountId);

  await enviarPushParaConta(admin, accountId, {
    titulo: "Lotação atingida",
    corpo: `${periodoTexto} de hoje encerrado por lotação.`,
    badge: totalHoje,
    url: "/reservas",
  });
}
