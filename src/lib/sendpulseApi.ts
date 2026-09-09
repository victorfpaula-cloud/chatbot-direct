const SENDPULSE_API_BASE = "https://api.sendpulse.com";

/**
 * Envio direto pra API da SendPulse (`POST /instagram/contacts/send`) — usado pela ponte (ver
 * src/app/api/bridge/sendpulse/route.ts) pra mandar TODAS as mensagens de um passo (texto e
 * botão) na ordem certa. Antes, só a mensagem com botão saía por esse caminho direto (imediato) e
 * o texto simples saía pela resposta HTTP de volta pro fluxo da SendPulse (que só entrega depois
 * que o fluxo deles processa) — isso fazia o texto chegar DEPOIS do botão no chat do cliente,
 * mesmo tendo sido decidido antes. Mandando tudo por aqui, na mesma ordem que foi decidido,
 * resolve isso.
 *
 * Autenticado pela "Chave de API" simples da conta da SendPulse (Configurações da conta > API >
 * Chaves de API), usada direto como Bearer token.
 *
 * Se a chave não estiver configurada, ou a chamada falhar por qualquer motivo, quem chama (a rota
 * da ponte) decide o que fazer — hoje, cai de volta pra devolver como texto na resposta HTTP.
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

export async function enviarTextoPelaApiDaSendPulse(contatoId: string, texto: string): Promise<void> {
  await enviarMensagemPelaApiDaSendPulse(contatoId, { type: "text", message: { text: texto } });
}

/**
 * Busca a foto de perfil de um contato pela API da SendPulse — necessário porque quem chega pela
 * ponte (ver src/app/api/bridge/sendpulse/route.ts) usa um ID interno da SendPulse
 * (`sendpulse:<contato_id>`), NUNCA o instagram_scoped_id (IGSID) de verdade da Meta. Chamar a
 * Graph API da Meta com esse ID sempre falha (é só isso que fazia o avatar nunca aparecer na tela
 * de Reservas de hoje pra quem reservou pela ponte — hoje, praticamente todo mundo, já que o App
 * Review da Meta ainda não saiu).
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

/**
 * Manda uma mensagem com botões tocáveis de verdade. Diferença importante desse formato: o botão
 * não carrega um payload livre como no Button Template da Meta — ele aponta pra um `to_chain_id`
 * (o ID de um "chain"/fluxo dentro do construtor visual da própria SendPulse, não o ID de um
 * bloco isolado), então ao tocar, quem continua a conversa é a SendPulse, não a Meta. Configurado
 * pra apontar de volta pro fluxo "Resposta padrão" que já chama nossa ponte — assim o toque no
 * botão vira uma nova mensagem entrando no mesmo fluxo de sempre.
 */
export async function enviarBotoesPelaApiDaSendPulse(
  contatoId: string,
  texto: string,
  botoes: { titulo: string; payload: string }[]
): Promise<void> {
  const toChainId = process.env.SENDPULSE_BOTAO_TO_CHAIN_ID;
  if (!toChainId) {
    throw new Error("SENDPULSE_BOTAO_TO_CHAIN_ID não configurado.");
  }

  await enviarMensagemPelaApiDaSendPulse(contatoId, {
    type: "generic_template",
    message: {
      attachment: {
        payload: {
          elements: [
            {
              title: texto,
              buttons: botoes.map((botao) => ({
                type: "postback",
                title: botao.titulo,
                data: { to_chain_id: toChainId },
              })),
            },
          ],
        },
      },
    },
  });
}
