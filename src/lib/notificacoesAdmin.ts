import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  notificarNovaReserva as notificarNovaReservaPush,
  notificarLotacaoParcial as notificarLotacaoParcialPush,
  notificarLotacaoAtingida as notificarLotacaoAtingidaPush,
} from "@/lib/webPush";
import { enviarWhatsAppTemplate } from "@/lib/kapsoApi";

type Admin = ReturnType<typeof criarClienteAdmin>;

// Templates precisam existir e estar APROVADOS no Kapso/Meta antes disso funcionar de verdade —
// ver texto sugerido na conversa que introduziu esse arquivo. Sem WhatsApp cadastrado em
// reserva_admin_whatsapp (chatbot_account_settings, editável em /contas/[id]/reserva), essa conta
// simplesmente não recebe alerta por WhatsApp — só o push de sempre continua valendo.
const TEMPLATE_LOTACAO_PARCIAL = "alerta_lotacao_meio";
const TEMPLATE_LOTACAO_MAXIMA = "alerta_lotacao_maxima";
const IDIOMA_TEMPLATE = "pt_BR";

/** Zero, um ou vários números — guardados como texto separado por vírgula (ver
 * WhatsAppsAdminEditor.tsx/reserva-config/route.ts). */
async function buscarWhatsAppsDoAdmin(admin: Admin, accountId: string): Promise<string[]> {
  const { data } = await admin
    .from("chatbot_account_settings")
    .select("reserva_admin_whatsapp")
    .eq("account_id", accountId)
    .maybeSingle();

  const texto: string = data?.reserva_admin_whatsapp ?? "";
  return texto
    .split(",")
    .map((numero) => numero.trim())
    .filter(Boolean);
}

async function buscarNomeDaConta(admin: Admin, accountId: string): Promise<string> {
  const { data } = await admin.from("chatbot_accounts").select("page_name").eq("id", accountId).maybeSingle();
  return data?.page_name?.trim() || "seu restaurante";
}

/** Reserva nova confirmada — continua só push por enquanto (é o aviso mais frequente de longe;
 * WhatsApp aqui viraria spam pro admin). WhatsApp fica reservado pros dois momentos que realmente
 * pedem atenção imediata: lotação passando de 50% e lotação máxima. */
export async function notificarNovaReserva(
  admin: Admin,
  accountId: string,
  nomeCliente: string | null,
  dataReservaBR: string | null
): Promise<void> {
  await notificarNovaReservaPush(admin, accountId, nomeCliente, dataReservaBR);
}

/** Dispara uma vez só, quando uma reserva confirmada faz a soma do dia+período cruzar 50% do
 * limite máximo pela primeira vez (mesma lógica de "cruzou o limiar" de notificarLotacaoAtingida,
 * ver chamada em reservas.ts). Push vai pra quem ativou notificação no painel (todo mundo da
 * conta); WhatsApp só pros números cadastrados em reserva_admin_whatsapp (pode não ter nenhum). */
export async function notificarLotacaoParcial(
  admin: Admin,
  accountId: string,
  periodoTexto: string,
  ocupado: number,
  limite: number
): Promise<void> {
  await notificarLotacaoParcialPush(admin, accountId, periodoTexto);

  const whatsapps = await buscarWhatsAppsDoAdmin(admin, accountId);
  if (whatsapps.length === 0) return;

  const nomeConta = await buscarNomeDaConta(admin, accountId);
  await Promise.all(
    whatsapps.map((whatsapp) =>
      enviarWhatsAppTemplate(whatsapp, TEMPLATE_LOTACAO_PARCIAL, IDIOMA_TEMPLATE, [
        periodoTexto,
        nomeConta,
        String(ocupado),
        String(limite),
      ])
    )
  );
}

/** Push de sempre + WhatsApp novo (se a conta tiver cadastrado reserva_admin_whatsapp). */
export async function notificarLotacaoAtingida(
  admin: Admin,
  accountId: string,
  periodoTexto: string
): Promise<void> {
  await notificarLotacaoAtingidaPush(admin, accountId, periodoTexto);

  const whatsapps = await buscarWhatsAppsDoAdmin(admin, accountId);
  if (whatsapps.length === 0) return;

  const nomeConta = await buscarNomeDaConta(admin, accountId);
  await Promise.all(
    whatsapps.map((whatsapp) =>
      enviarWhatsAppTemplate(whatsapp, TEMPLATE_LOTACAO_MAXIMA, IDIOMA_TEMPLATE, [periodoTexto, nomeConta])
    )
  );
}
