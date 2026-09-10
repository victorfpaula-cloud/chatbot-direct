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

/**
 * Manda uma notificação push pra todo mundo que ativou "Notificações" nessa conta, avisando de
 * uma reserva nova — e junto manda o total de reservas do dia, pra quem recebeu já poder atualizar
 * o numerozinho no ícone (ver public/sw.js) sem precisar abrir o app. Chamada só depois que a
 * reserva já está gravada no banco (finalizarReserva, em reservas.ts) — uma falha aqui nunca pode
 * impedir a reserva em si de ser confirmada, por isso nunca lança erro pra quem chama.
 */
export async function notificarNovaReserva(admin: Admin, accountId: string, resumo: string): Promise<void> {
  if (!garantirConfigurado()) return;

  try {
    const hoje = hojeEmSaoPauloISO();
    const [{ data: inscricoes }, { count: totalHoje }] = await Promise.all([
      admin.from("chatbot_push_subscriptions").select("id, endpoint, p256dh, auth").eq("account_id", accountId),
      admin
        .from("chatbot_reservations")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("data_reserva", hoje),
    ]);

    if (!inscricoes || inscricoes.length === 0) return;

    const payload = JSON.stringify({
      titulo: "Nova reserva",
      corpo: resumo,
      badge: totalHoje ?? 0,
      url: "/reservas",
    });

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
    console.error("Falha ao processar notificações push da reserva:", erro);
  }
}
