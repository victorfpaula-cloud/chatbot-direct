const SENDPULSE_API_BASE = "https://api.sendpulse.com";

/**
 * A ponte que usava a API da SendPulse pra mandar mensagem de verdade pro Direct
 * (src/app/api/bridge/sendpulse/route.ts) foi removida depois que o App Review da Meta aprovou o
 * chatbot-direct e o Victor desligou o fluxo da SendPulse por completo (16/09). O que sobra aqui
 * serve só reserva ANTIGA feita por aquela ponte, cujo `instagram_scoped_id` ficou salvo como
 * `sendpulse:<contato_id>` — nenhum atendimento novo passa mais por aqui, e o lembrete de reserva
 * (src/lib/lembreteDeReserva.ts) foi pro WhatsApp (22/09), então nem manda mensagem por aqui mais:
 * só resta a busca de foto de perfil abaixo, pra mostrar o avatar dessas reservas antigas na tela
 * de Reservas de hoje.
 *
 * Autenticado pela "Chave de API" simples da conta da SendPulse (Configurações da conta > API >
 * Chaves de API), usada direto como Bearer token.
 */

/**
 * Busca a foto de perfil de um contato pela API da SendPulse — necessário pra reserva ANTIGA feita
 * pela ponte (já removida), cujo `instagram_scoped_id` é um ID interno da SendPulse
 * (`sendpulse:<contato_id>`), nunca o instagram_scoped_id (IGSID) de verdade da Meta. Chamar a
 * Graph API da Meta com esse ID sempre falha — usado hoje só pela tela de Reservas de hoje
 * (PainelDeReservas.tsx) pra mostrar o avatar de reservas antigas.
 *
 * Endpoint e formato do campo confirmados na OpenAPI spec da SendPulse pro serviço Instagram: `id`
 * vai por query string (não no path), e a foto vem em `data.channel_data.profile_pic`.
 */
export async function buscarFotoDePerfilPelaApiDaSendPulse(contatoId: string): Promise<string | null> {
  const chaveDeApi = process.env.SENDPULSE_API_KEY;
  if (!chaveDeApi) return null;

  try {
    const resposta = await fetch(
      `${SENDPULSE_API_BASE}/instagram/contacts/get?id=${encodeURIComponent(contatoId)}`,
      {
        headers: { Authorization: `Bearer ${chaveDeApi}` },
        cache: "no-store",
      }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    const foto = dados?.data?.channel_data?.profile_pic;
    return typeof foto === "string" && foto.length > 0 ? foto : null;
  } catch (erro) {
    console.error("Falha ao buscar foto de perfil pela API da SendPulse:", erro);
    return null;
  }
}
