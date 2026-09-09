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
 * Autenticado pela "Chave de API" simples da conta da SendPulse (Configurações da conta > API >
 * Chaves de API), usada direto como Bearer token — não precisa do vaivém de Client ID/Secret
 * (SendPulse aceita os dois jeitos, esse é o mais simples).
 *
 * Chamada só quando o fluxo de reserva gera um passo com botão (ver decidirEResponder/reservas.ts
 * através do coletor da ponte) — se a chave não estiver configurada ainda, ou a chamada falhar por
 * qualquer motivo, quem chamou (a rota da ponte) cai de volta na lista de texto simples que já
 * funciona hoje. Nada aqui muda o fluxo direto pela Meta nem qualquer coisa já em uso.
 */
export async function enviarBotoesPelaApiDaSendPulse(
  contatoId: string,
  texto: string,
  botoes: { titulo: string; payload: string }[]
): Promise<void> {
  const chaveDeApi = process.env.SENDPULSE_API_KEY;
  const toChainId = process.env.SENDPULSE_BOTAO_TO_CHAIN_ID;

  if (!chaveDeApi) {
    throw new Error("SENDPULSE_API_KEY não configurada.");
  }
  if (!toChainId) {
    throw new Error("SENDPULSE_BOTAO_TO_CHAIN_ID não configurado.");
  }

  const resposta = await fetch(`${SENDPULSE_API_BASE}/instagram/contacts/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chaveDeApi}`,
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
