import type { RelatorioSemanal } from "@/lib/relatorioSemanal";

// Envio de e-mail via Resend (REST API pura, sem SDK) — mesmo padrão já usado nos projetos irmãos
// agendador-stories e ShoppingHub (ver src/lib/email.ts de lá). Usado só pra avisar o Victor
// quando o Gemini identifica uma reclamação numa conversa do Direct, pra ele conseguir tratar ou
// encaminhar pro responsável rápido.
//
// Nunca lança erro: se RESEND_API_KEY/ALERT_EMAIL não estiverem configuradas, ou o envio falhar
// por qualquer motivo, quem chama segue normalmente — um aviso que não chegou nunca pode travar
// nem confundir o processamento de uma mensagem real.
const RESEND_API_URL = "https://api.resend.com/emails";

// Domínio automesa.com.br verificado na Resend (SPF/DKIM configurados) — dá pra mandar de
// qualquer endereço @automesa.com.br, mesmo sem essa caixa existir de verdade (a Resend não
// confere se a caixa existe, só que o domínio é seu). Antes disso o remetente era o
// onboarding@resend.dev padrão da Resend, que só entregava pro e-mail dono da própria conta
// Resend — não dava pra mandar relatório pra e-mail arbitrário de cliente. Agora entrega
// normalmente pra qualquer destinatário.
const REMETENTE = "Chatbot Direct <relatorios@automesa.com.br>";

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
        from: REMETENTE,
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

function formatarPeriodoExtenso(segundaISO: string, domingoISO: string): string {
  const formatarDia = (iso: string) => {
    const [ano, mes, dia] = iso.split("-").map((v) => parseInt(v, 10));
    return new Date(Date.UTC(ano, mes - 1, dia, 12));
  };
  const inicio = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long" }).format(
    formatarDia(segundaISO)
  );
  const fim = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }).format(
    formatarDia(domingoISO)
  );
  return `${inicio} a ${fim}`;
}

// Gráfico de barras em tabela HTML (não SVG/CSS) — técnica antiga mas de propósito: é a única que
// renderiza de forma confiável na maioria dos clientes de e-mail (Gmail, Outlook etc.), que cortam
// boa parte de CSS moderno e não confiam em SVG inline. Cada barra é uma célula colorida com
// largura em %, ao lado do rótulo do dia e do valor.
function montarGraficoDeBarrasHTML(pontos: { rotulo: string; total: number }[]): string {
  const maximo = Math.max(1, ...pontos.map((p) => p.total));
  const linhas = pontos
    .map((p) => {
      const larguraPct = Math.round((p.total / maximo) * 100);
      return `
        <tr>
          <td style="padding:4px 10px 4px 0; font-size:12px; color:#a1a1aa; width:36px;">${p.rotulo}</td>
          <td style="padding:4px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1f27; border-radius:4px;">
              <tr>
                <td style="background:#6366f1; border-radius:4px; width:${larguraPct}%; height:14px; font-size:0;">&nbsp;</td>
                <td></td>
              </tr>
            </table>
          </td>
          <td style="padding:4px 0 4px 10px; font-size:12px; color:#f5f5f7; text-align:right; width:28px;">${p.total}</td>
        </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>`;
}

/**
 * Envia o relatório semanal de uma conta pro e-mail cadastrado nela — usado tanto pelo botão
 * "Enviar agora" (/contas/[id]/relatorios) quanto pelo cron de toda segunda-feira. Ao contrário de
 * enviarEmailDeReclamacao (que nunca lança e nunca informa quem chamou), essa função DEVOLVE o
 * resultado: o botão manual precisa mostrar pro Victor se realmente funcionou (ver aviso sobre a
 * restrição do remetente onboarding@resend.dev logo ali em cima).
 */
export async function enviarRelatorioSemanal(
  destinatario: string,
  relatorio: RelatorioSemanal
): Promise<{ sucesso: boolean; erro?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sucesso: false, erro: "RESEND_API_KEY não configurada nesse ambiente." };

  const periodo = formatarPeriodoExtenso(relatorio.segundaISO, relatorio.domingoISO);
  const grafico = montarGraficoDeBarrasHTML(relatorio.mensagensPorDia.map((p) => ({ rotulo: p.rotulo, total: p.total })));

  const linhaStories =
    relatorio.storiesHabilitado && relatorio.storiesConectado
      ? `<td style="padding:0 0 0 16px;"><p style="margin:0; font-size:12px; color:#a1a1aa;">STORIES PUBLICADOS</p><p style="margin:2px 0 0; font-size:26px; font-weight:700; color:#f5f5f7;">${relatorio.totalStoriesPublicados}</p></td>`
      : "";

  const html = `
    <div style="background:#050509; padding:28px 20px; font-family:Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto; background:#0d0d13; border:1px solid #1f1f27; border-radius:16px; overflow:hidden;">
        <tr><td style="padding:24px 24px 4px;">
          <p style="margin:0; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#818cf8;">Relatório semanal</p>
          <h1 style="margin:6px 0 0; font-size:20px; color:#f5f5f7;">${relatorio.contaNome}</h1>
          <p style="margin:4px 0 20px; font-size:13px; color:#71717a;">${periodo}</p>
        </td></tr>
        <tr><td style="padding:0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td><p style="margin:0; font-size:12px; color:#a1a1aa;">ATENDIMENTOS</p><p style="margin:2px 0 0; font-size:26px; font-weight:700; color:#f5f5f7;">${relatorio.totalAtendimentos}</p></td>
              <td style="padding:0 0 0 16px;"><p style="margin:0; font-size:12px; color:#a1a1aa;">MENSAGENS</p><p style="margin:2px 0 0; font-size:26px; font-weight:700; color:#f5f5f7;">${relatorio.totalMensagens}</p></td>
              ${linhaStories}
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 24px 0;">
          <p style="margin:0 0 10px; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#71717a;">Mensagens por dia</p>
          ${grafico}
        </td></tr>
        <tr><td style="padding:20px 24px 24px;">
          <p style="margin:0; font-size:11px; color:#52525b;">Relatório automático do Chatbot Direct.</p>
        </td></tr>
      </table>
    </div>`;

  try {
    const resposta = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [destinatario],
        // Sem caixa de e-mail de verdade atrás de relatorios@automesa.com.br — se o cliente
        // responder o relatório, cai aqui (mesmo e-mail que já recebe os avisos de reclamação),
        // não se perde no vazio. Omitido se ALERT_EMAIL não estiver configurada.
        reply_to: process.env.ALERT_EMAIL || undefined,
        subject: `Relatório semanal — ${relatorio.contaNome} (${periodo})`,
        html,
      }),
      cache: "no-store",
    });

    if (!resposta.ok) {
      const corpoDoErro = await resposta.text().catch(() => "");
      console.error(`Falha ao enviar relatório semanal (${resposta.status}): ${corpoDoErro}`);
      return { sucesso: false, erro: `Resend recusou o envio (${resposta.status}).` };
    }

    return { sucesso: true };
  } catch (erro) {
    console.error("Falha ao enviar relatório semanal:", erro);
    return { sucesso: false, erro: "Falha de conexão com o Resend." };
  }
}
