// Envio de e-mail via Resend (REST API pura, sem SDK) — mesmo padrão já usado nos projetos irmãos
// agendador-stories e ShoppingHub (ver src/lib/email.ts de lá). Usado só pra avisar o Victor
// quando o Gemini identifica uma reclamação numa conversa do Direct, pra ele conseguir tratar ou
// encaminhar pro responsável rápido.
//
// Nunca lança erro: se RESEND_API_KEY/ALERT_EMAIL não estiverem configuradas, ou o envio falhar
// por qualquer motivo, quem chama segue normalmente — um aviso que não chegou nunca pode travar
// nem confundir o processamento de uma mensagem real.
const RESEND_API_URL = "https://api.resend.com/emails";

export async function enviarEmailDeReclamacao(dados: {
  contaNome: string;
  clienteNome: string;
  clienteUsername: string | null;
  mensagemDoCliente: string;
  respostaEnviada: string;
  horario: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const destinatario = process.env.ALERT_EMAIL;

  if (!apiKey || !destinatario) return;

  const identificacaoDoCliente = dados.clienteUsername
    ? `${dados.clienteNome} (@${dados.clienteUsername})`
    : dados.clienteNome;

  const corpo = [
    "Nova reclamação detectada e registrada no chatbot-direct.",
    "",
    `Conta: ${dados.contaNome}`,
    `Cliente: ${identificacaoDoCliente}`,
    `Horário: ${dados.horario}`,
    "",
    `Reclamação: ${dados.mensagemDoCliente}`,
    "",
    `Resposta que o Gemini deu: ${dados.respostaEnviada}`,
    "",
    "Precisa de atenção — dá uma olhada e encaminha pro responsável se for o caso.",
  ].join("\n");

  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Remetente padrão do Resend — funciona sem precisar configurar domínio próprio nenhum,
        // é suficiente pra mandar um aviso pro Victor mesmo (mesma escolha do agendador-stories).
        from: "Chatbot Direct <onboarding@resend.dev>",
        to: [destinatario],
        subject: `Nova reclamação — ${dados.contaNome}`,
        text: corpo,
      }),
      cache: "no-store",
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de aviso de reclamação:", erro);
  }
}
