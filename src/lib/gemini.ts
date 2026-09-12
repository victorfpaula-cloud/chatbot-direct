// Chamada à API do Gemini (Google) pra gerar a resposta quando nenhuma palavra-chave bate.
// O nome do modelo é configurável via variável de ambiente (GEMINI_MODEL) — se o nome padrão
// abaixo não existir mais na sua conta do Google AI Studio, dá pra trocar sem precisar mexer
// em código, só ajustando essa variável na Vercel.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export async function gerarRespostaComGemini(
  promptDoSistema: string,
  mensagemDoCliente: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY não está definida nas variáveis de ambiente.");
    return null;
  }

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: promptDoSistema }] },
        contents: [{ role: "user", parts: [{ text: mensagemDoCliente }] }],
      }),
      cache: "no-store",
    }
  );

  if (!resposta.ok) {
    const corpoErro = await resposta.text().catch(() => "");
    console.error(`Falha ao chamar o Gemini (status ${resposta.status}):`, corpoErro);
    return null;
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof texto === "string" ? texto.trim() : null;
}

/**
 * Classificação separada e barata (não é a resposta de verdade pro cliente, só uma checagem extra
 * que roda depois que ela já foi enviada) — usada só pra decidir se dispara o aviso por e-mail de
 * reclamação (ver enviarEmailDeReclamacao, em email.ts). Em qualquer falha (rede, chave não
 * configurada, resposta fora do esperado), assume que NÃO é reclamação: melhor deixar passar um
 * aviso do que arriscar travar o processamento de uma mensagem por causa de uma checagem extra.
 */
export async function detectarReclamacao(mensagemDoCliente: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return false;

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  'Você classifica mensagens que clientes mandam no Instagram Direct de um negócio. ' +
                  'Responda SOMENTE "SIM" se a mensagem for uma reclamação de verdade (insatisfação ' +
                  'com produto, atendimento, cobrança, demora, erro etc.) ou SOMENTE "NAO" pra ' +
                  "qualquer outra coisa (dúvida, elogio, pedido, conversa neutra). Nunca responda " +
                  "mais nada além dessa única palavra.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: mensagemDoCliente }] }],
        }),
        cache: "no-store",
      }
    );

    if (!resposta.ok) return false;

    const dados = await resposta.json();
    const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof texto === "string" && texto.trim().toUpperCase().startsWith("SIM");
  } catch (erro) {
    console.error("Falha ao classificar reclamação com o Gemini:", erro);
    return false;
  }
}
