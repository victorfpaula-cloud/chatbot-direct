const SENDPULSE_API_BASE = "https://api.sendpulse.com";

/**
 * Envio de botão de verdade pra ponte do SendPulse (ver src/app/api/bridge/sendpulse/route.ts).
 * O construtor de fluxo visual da SendPulse não deixa montar um botão tocável dinâmico a partir
 * da resposta de uma API (só texto simples) — mas a API DELES tem um jeito de mandar mensagem com
 * botão de verdade direto pro Instagram (`POST /instagram/contacts/send`, tipo
 * "generic_template"). Diferença importante desse formato: o botão não carrega um payload livre
 * como no Button Template da Meta — ele aponta pra um `to_chain_id` (o ID de um bloco dentro do
 * fluxo visual da própria SendPulse), então ao tocar, quem continua a conversa é a SendPulse, não
 * a Meta. Configurado pra apontar de volta pro bloco "Solicitação de API" que já chama nossa
 * ponte — assim o toque no botão vira uma nova mensagem entrando no mesmo fluxo de sempre.
 *
 * Chamada só quando o fluxo de reserva gera um passo com botão (ver decidirEResponder/reservas.ts
 * através do coletor da ponte) — se as credenciais não estiverem configuradas ainda, ou a chamada
 * falhar por qualquer motivo, quem chamou (a rota da ponte) cai de volta na lista de texto simples
 * que já funciona hoje. Nada aqui muda o fluxo direto pela Meta nem qualquer coisa já em uso.
 */

let tokenCacheado: { token: string; expiraEm: number } | null = null;

async function obterTokenDeAcesso(): Promise<string> {
  if (tokenCacheado && tokenCacheado.expiraEm > Date.now()) {
    return tokenCacheado.token;
  }

  const clientId = process.env.SENDPULSE_API_CLIENT_ID;
  const clientSecret = process.env.SENDPULSE_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SENDPULSE_API_CLIENT_ID/SENDPULSE_API_CLIENT_SECRET não configurados.");
  }

  const resposta = await fetch(`${SENDPULSE_API_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    throw new Error(`Falha ao obter token da API da SendPulse (status ${resposta.status}): ${corpoErro}`);
  }

  const dados = await resposta.json();
  if (typeof dados?.access_token !== "string") {
    throw new Error("Resposta da SendPulse sem access_token.");
  }

  // Renova 60s antes de expirar de verdade, pra nunca usar um token vencido por pouco.
  tokenCacheado = {
    token: dados.access_token,
    expiraEm: Date.now() + (Number(dados.expires_in ?? 3600) - 60) * 1000,
  };
  return tokenCacheado.token;
}

/**
 * Manda uma mensagem com botões tocáveis de verdade pro contato via API da SendPulse. Lança erro
 * se as credenciais ou o `to_chain_id` não estiverem configurados, ou se a chamada falhar — quem
 * chama decide o que fazer no fallback (ver api/bridge/sendpulse/route.ts).
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

  const token = await obterTokenDeAcesso();

  const resposta = await fetch(`${SENDPULSE_API_BASE}/instagram/contacts/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      contact_id: contatoId,
      messages: [
        {
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
        },
      ],
    }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    throw new Error(`Falha ao enviar botões pela API da SendPulse (status ${resposta.status}): ${corpoErro}`);
  }
}
