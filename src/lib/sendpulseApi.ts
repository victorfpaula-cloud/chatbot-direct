const SENDPULSE_API_BASE = "https://api.sendpulse.com";

/**
 * Envio direto pra API da SendPulse (`POST /instagram/contacts/send`) — a ponte que usava isso pra
 * mandar mensagem de verdade pro Direct (src/app/api/bridge/sendpulse/route.ts) foi removida
 * depois que o App Review da Meta aprovou o chatbot-direct e o Victor desligou o fluxo da
 * SendPulse por completo (16/09). O que sobra aqui serve só reserva ANTIGA feita por aquela ponte,
 * cujo `instagram_scoped_id` ficou salvo como `sendpulse:<contato_id>` (ver
 * enviarTextoPelaApiDaSendPulse, usado pelo lembrete de reserva) — nenhum atendimento novo passa
 * mais por aqui.
 *
 * Autenticado pela "Chave de API" simples da conta da SendPulse (Configurações da conta > API >
 * Chaves de API), usada direto como Bearer token.
 */
async function enviarMensagemPelaApiDaSendPulse(contatoId: string, mensagem: Record<string, unknown>): Promise<void> {
  const chaveDeApi = process.env.SENDPULSE_API_KEY;
  if (!chaveDeApi) {
    throw new Error("SENDPULSE_API_KEY não configurada.");
  }

  const resposta = await fetch(`${SENDPULSE_API_BASE}/instagram/contacts/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chaveDeApi}`,
    },
    body: JSON.stringify({
      contact_id: contatoId,
      messages: [mensagem],
    }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    throw new Error(`Falha ao enviar mensagem pela API da SendPulse (status ${resposta.status}): ${corpoErro}`);
  }
}

// Usado só pelo lembrete de reserva (src/lib/lembreteDeReserva.ts) pra avisar quem confirmou
// reserva pela ponte antiga (`instagram_scoped_id` no formato `sendpulse:<contato_id>`) — a Graph
// API da Meta não tem como mandar mensagem pra esse ID sintético.
export async function enviarTextoPelaApiDaSendPulse(contatoId: string, texto: string): Promise<void> {
  await enviarMensagemPelaApiDaSendPulse(contatoId, { type: "text", message: { text: texto } });
}

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
