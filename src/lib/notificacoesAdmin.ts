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
// Novo lead (imobiliário, 19/11/2026) — ainda precisa ser cadastrado e aprovado na Meta antes de
// funcionar de verdade (mesmo processo dos outros dois). De propósito com SÓ 2 variáveis fixas
// (nome/@ do cliente + um bloco de resumo já formatado com quebras de linha) em vez de uma
// variável por pergunta — isso evita de vez a classe de bug que já pegou os outros dois templates
// duas vezes nessa conta (contagem de parâmetro tem que bater exatamente com o template aprovado;
// como aqui o número de perguntas ativas varia por conta, mapear 1 pra 1 ia quebrar toda vez que
// alguém mudasse quais perguntas estão ligadas). Sugestão de corpo pra cadastrar na Meta:
// "Novo contato interessado em imóvel! Cliente: {{1}}. {{2}}"
const TEMPLATE_NOVO_LEAD = "alerta_novo_lead_imobiliario";
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

/** Mesmo padrão de buscarWhatsAppsDoAdmin, mas lendo leads_admin_whatsapp (coluna separada —
 * imobiliária pode querer mandar lead pra um WhatsApp diferente do de reserva, caso um dia tenha
 * as duas coisas ativas). */
async function buscarWhatsAppsDoLead(admin: Admin, accountId: string): Promise<string[]> {
  const { data } = await admin
    .from("chatbot_account_settings")
    .select("leads_admin_whatsapp")
    .eq("account_id", accountId)
    .maybeSingle();

  const texto: string = data?.leads_admin_whatsapp ?? "";
  return texto
    .split(",")
    .map((numero) => numero.trim())
    .filter(Boolean);
}

const RASTRO_DA_PERGUNTA: Record<string, string> = {
  interesse: "Interesse",
  tipo: "Tipo de imóvel",
  regiao: "Região",
  preco: "Faixa de preço",
  quartos: "Quartos",
};

/** Lead novo qualificado (vertical Imobiliário) — monta um resumo de poucas linhas com só as
 * respostas que a conta realmente coletou (dados vem de leads.ts/finalizarLead, já filtrado pelas
 * perguntas ativas daquela conta) e manda pro(s) WhatsApp cadastrado(s) em leads_admin_whatsapp.
 * Sem número cadastrado, não manda nada — o lead já fica salvo em chatbot_leads de qualquer jeito,
 * visível na aba Leads. */
export async function notificarNovoLead(
  admin: Admin,
  accountId: string,
  nomeCliente: string,
  dados: Record<string, string | undefined>,
  leadId?: string
): Promise<void> {
  const whatsapps = await buscarWhatsAppsDoLead(admin, accountId);
  if (whatsapps.length === 0) return;

  const resumo = Object.entries(RASTRO_DA_PERGUNTA)
    .filter(([chave]) => dados[chave])
    .map(([chave, rotulo]) => `${rotulo}: ${dados[chave]}`)
    .join("\n");

  await Promise.all(
    whatsapps.map((whatsapp) =>
      enviarWhatsAppTemplate(whatsapp, TEMPLATE_NOVO_LEAD, IDIOMA_TEMPLATE, [
        nomeCliente,
        resumo || "(sem detalhes coletados)",
      ])
    )
  );
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

/** Push de sempre (esse continua usando periodoTexto na mensagem, sem restrição nenhuma da Meta) +
 * WhatsApp novo (se a conta tiver cadastrado reserva_admin_whatsapp). Template aprovado pelo
 * Victor na Meta ("alerta_lotacao_maxima") não tem nenhuma variável no corpo ("A lotação máxima do
 * dia foi atingida e as reservas foram encerradas.") — mesma causa do lembrete de reserva não sair
 * (ver comentário em lembreteDeReserva.ts): mandar parâmetro pra um template sem placeholder
 * nenhum faz a Meta recusar a mensagem inteira, silenciosamente. */
export async function notificarLotacaoAtingida(
  admin: Admin,
  accountId: string,
  periodoTexto: string
): Promise<void> {
  await notificarLotacaoAtingidaPush(admin, accountId, periodoTexto);

  const whatsapps = await buscarWhatsAppsDoAdmin(admin, accountId);
  if (whatsapps.length === 0) return;

  await Promise.all(
    whatsapps.map((whatsapp) => enviarWhatsAppTemplate(whatsapp, TEMPLATE_LOTACAO_MAXIMA, IDIOMA_TEMPLATE, []))
  );
}
