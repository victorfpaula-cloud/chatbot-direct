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
 * Chamada em toda reserva nova confirmada (finalizarReserva, em reservas.ts). Mensagem bem
 * simples de propósito (sem nome/quantidade) — quem quiser o detalhe abre o app, que já reflete a
 * reserva na hora; aqui só avisa que aconteceu, gastando o mínimo de dados possível.
 */
export async function notificarNovaReserva(admin: Admin, accountId: string): Promise<void> {
  const totalHoje = await contarReservasDeHoje(admin, accountId);

  await enviarPushParaConta(admin, accountId, {
    titulo: "Nova reserva",
    corpo: "Uma nova reserva acaba de ser feita.",
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
