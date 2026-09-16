import type { Relatorio } from "@/lib/relatorioSemanal";

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

function formatarPeriodoExtenso(inicioISO: string, fimISO: string): string {
  const formatarDia = (iso: string) => {
    const [ano, mes, dia] = iso.split("-").map((v) => parseInt(v, 10));
    return new Date(Date.UTC(ano, mes - 1, dia, 12));
  };
  const inicio = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long" }).format(
    formatarDia(inicioISO)
  );
  const fim = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }).format(
    formatarDia(fimISO)
  );
  return `${inicio} a ${fim}`;
}

function formatarDataCurtaEmail(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map((v) => parseInt(v, 10));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(
    new Date(Date.UTC(ano, mes - 1, dia, 12))
  );
}

function formatarHoraEmail(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

function formatarDuracaoEmail(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto > 0 ? `${minutos}min ${resto}s` : `${minutos}min`;
}

// Nome/@usuário vêm da Graph API do Instagram (dado de fora) — escapa antes de colocar no HTML do
// e-mail pra um nome com "&"/"<"/">" nunca quebrar a tabela.
function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Um "quadradinho" de métrica — mesmo conceito visual da tela /contas/[id]/relatorios (rótulo
// pequeno em cima, número grande embaixo). Só monta os dados aqui — quem desenha de verdade é
// linhaDeQuadradinhos, colocando cada um numa <td> própria.
type DadosDoQuadradinho = { rotulo: string; corpoHtml: string; bg?: string; borda?: string };
function quadradinho(rotulo: string, corpoHtml: string, opts?: { bg?: string; borda?: string }): DadosDoQuadradinho {
  return { rotulo, corpoHtml, bg: opts?.bg, borda: opts?.borda };
}

// Uma linha de quadradinhos lado a lado — número de colunas se ajusta ao que tem pra mostrar (ex.:
// Reservas/Stories só aparecem quando a conta tem esse produto contratado).
//
// Borda/fundo/padding vão DIRETO na <td>, nunca numa <div> por dentro dela: uma <div> só fica do
// tamanho do próprio conteúdo (mesmo com height:100% — não funciona sem a <td> ter uma altura
// explícita em pixel, e ela nunca tem), então Reservas/Stories (com uma linha a mais de legenda) ou
// um rótulo que quebra em duas linhas (ex.: "TEMPO MÉDIO DE RESPOSTA") saíam visivelmente maiores
// que os vizinhos — reportado com print de verdade mostrando as caixas de altura diferente. A <td>
// em si SEMPRE tem a mesma altura que as outras da mesma linha (regra nativa de toda <table>, sem
// precisar de nenhum CSS extra), então o quadradinho fica automaticamente do mesmo tamanho.
// O espaçamento entre eles é uma <td> vazia de 8px (mais confiável em cliente de e-mail do que
// border-spacing ou margin, que não existe em <td>).
function linhaDeQuadradinhos(celulas: DadosDoQuadradinho[]): string {
  const larguraPct = Math.floor(100 / celulas.length);
  const ESPACADOR = `<td width="8" style="font-size:0; line-height:0;">&nbsp;</td>`;
  const tds = celulas
    .map((c, i) => {
      const bg = c.bg ?? "#fafafa";
      const borda = c.borda ?? "#e4e4e7";
      const td = `<td width="${larguraPct}%" valign="top" bgcolor="${bg}" style="background:${bg}; border:1px solid ${borda}; border-radius:10px; padding:10px 12px;">
        <p style="margin:0; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#71717a;">${c.rotulo}</p>
        ${c.corpoHtml}
      </td>`;
      return i < celulas.length - 1 ? td + ESPACADOR : td;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed; margin-bottom:10px;"><tr>${tds}</tr></table>`;
}

const NUMERO_GRANDE = 'style="margin:4px 0 0; font-size:21px; font-weight:800; color:#18181b;"';
const LEGENDA_PEQUENA = 'style="margin:1px 0 0; font-size:10px; color:#71717a;"';

/**
 * Envia o relatório de uma conta (período de N dias — 7/15/30, ver seletor em
 * /contas/[id]/relatorios) pro e-mail cadastrado nela — usado tanto pelo botão "Enviar agora"
 * quanto pelo cron de toda segunda-feira. Ao contrário de enviarEmailDeReclamacao (que nunca
 * lança e nunca informa quem chamou), essa função DEVOLVE o resultado: o botão manual precisa
 * mostrar pro Victor se realmente funcionou (ver aviso sobre a restrição do remetente
 * onboarding@resend.dev logo ali em cima).
 */
export async function enviarRelatorioSemanal(
  destinatario: string,
  relatorio: Relatorio
): Promise<{ sucesso: boolean; erro?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sucesso: false, erro: "RESEND_API_KEY não configurada nesse ambiente." };

  const periodo = formatarPeriodoExtenso(relatorio.inicioISO, relatorio.fimISO);

  // Linha 1 — os mesmos totais do topo da tela de relatórios (Reservas/Stories só aparecem se a
  // conta tiver esse produto contratado, por isso a lista é montada dinamicamente).
  const quadradinhosPrincipais = [
    quadradinho("Atendimentos", `<p ${NUMERO_GRANDE}>${relatorio.totalAtendimentos}</p>`),
    quadradinho("Mensagens", `<p ${NUMERO_GRANDE}>${relatorio.totalMensagens}</p>`),
  ];
  if (relatorio.reservaHabilitada && relatorio.totalReservas !== null) {
    quadradinhosPrincipais.push(
      quadradinho(
        "Reservas",
        `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:14px;"><p ${NUMERO_GRANDE}>${relatorio.totalReservas}</p><p ${LEGENDA_PEQUENA}>reservas</p></td>
          <td><p ${NUMERO_GRANDE}>${relatorio.totalPessoasReservas}</p><p ${LEGENDA_PEQUENA}>pessoas</p></td>
        </tr></table>`,
        { bg: "#ecfdf5", borda: "#a7f3d0" }
      )
    );
  }
  if (relatorio.storiesHabilitado && relatorio.storiesConectado) {
    const erroLinha =
      (relatorio.totalStoriesComErro ?? 0) > 0
        ? `<p style="margin:1px 0 0; font-size:10px; font-weight:600; color:#b91c1c;">${relatorio.totalStoriesComErro} com erro</p>`
        : "";
    quadradinhosPrincipais.push(
      quadradinho("Stories publicados", `<p ${NUMERO_GRANDE}>${relatorio.totalStoriesPublicados}</p>${erroLinha}`, {
        bg: "#fffbeb",
        borda: "#fde68a",
      })
    );
  }

  // Linha 2 — os quatro indicadores que substituíram o gráfico de barras na tela (que só fazia
  // sentido em período de até 14 dias — em 15/30 dias virava barra sem nenhum rótulo).
  const diaMaisMovimentadoHtml = relatorio.diaComMaisMensagens
    ? `<p ${NUMERO_GRANDE}>${relatorio.diaComMaisMensagens.total}</p><p ${LEGENDA_PEQUENA}>mensagens em ${formatarDataCurtaEmail(relatorio.diaComMaisMensagens.dataISO)}</p>`
    : `<p style="margin:4px 0 0; font-size:12px; color:#71717a;">Sem mensagens no período.</p>`;

  const tempoMedioHtml =
    relatorio.tempoMedioDeRespostaSegundos !== null
      ? `<p ${NUMERO_GRANDE}>${formatarDuracaoEmail(relatorio.tempoMedioDeRespostaSegundos)}</p>`
      : `<p style="margin:4px 0 0; font-size:12px; color:#71717a;">Ainda sem dados.</p>`;

  const quadradinhosSecundarios = [
    quadradinho("Média por dia", `<p ${NUMERO_GRANDE}>${relatorio.mediaMensagensPorDia}</p><p ${LEGENDA_PEQUENA}>mensagens/dia</p>`),
    quadradinho("Dia mais movimentado", diaMaisMovimentadoHtml),
    quadradinho("Tempo médio de resposta", tempoMedioHtml),
    quadradinho(
      "Atendimentos com erro",
      `<p style="margin:4px 0 0; font-size:21px; font-weight:800; color:${relatorio.totalComErro > 0 ? "#b91c1c" : "#18181b"};">${relatorio.totalComErro}</p>`,
      relatorio.totalComErro > 0 ? { bg: "#fef2f2", borda: "#fecaca" } : undefined
    ),
  ];

  // Atendimentos detalhados — mesma "lista telefônica" da tela, um cliente por linha.
  const linhasDeAtendimento =
    relatorio.atendimentos.length === 0
      ? `<tr><td colspan="5" style="padding:14px; font-size:13px; color:#71717a;">Nenhum atendimento nesse período.</td></tr>`
      : relatorio.atendimentos
          .map((a) => {
            const nome = escaparHtml(a.clienteNome ?? "Cliente");
            const username = a.clienteUsername
              ? `<span style="color:#a1a1aa;"> · @${escaparHtml(a.clienteUsername)}</span>`
              : "";
            const badgeErro = a.teveErro
              ? `<span style="margin-left:6px; padding:1px 6px; border-radius:999px; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; font-size:9px; font-weight:700;">erro</span>`
              : "";
            return `<tr>
              <td style="padding:8px 10px; border-top:1px solid #e4e4e7; font-size:12px; color:#27272a;">${nome}${username}${badgeErro}</td>
              <td style="padding:8px 10px; border-top:1px solid #e4e4e7; font-size:12px; color:#52525b; white-space:nowrap;">${formatarDataCurtaEmail(a.diaISO)}</td>
              <td style="padding:8px 10px; border-top:1px solid #e4e4e7; font-size:12px; color:#52525b; white-space:nowrap;">${a.horarioMensagem ? formatarHoraEmail(a.horarioMensagem) : "—"}</td>
              <td style="padding:8px 10px; border-top:1px solid #e4e4e7; font-size:12px; color:#52525b; white-space:nowrap;">${formatarHoraEmail(a.horarioResposta)}</td>
              <td style="padding:8px 10px; border-top:1px solid #e4e4e7; font-size:12px; color:#27272a; text-align:right;">${a.totalMensagens}</td>
            </tr>`;
          })
          .join("");

  const tabelaAtendimentos = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#f4f4f5;">
      <th align="left" style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#71717a;">Cliente</th>
      <th align="left" style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#71717a;">Dia</th>
      <th align="left" style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#71717a;">Mensagem</th>
      <th align="left" style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#71717a;">Resposta</th>
      <th align="right" style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#71717a;">Msgs</th>
    </tr>
    ${linhasDeAtendimento}
  </table>`;

  // Stories publicados por dia — só entra se a conta tiver o Agendador de Stories conectado.
  // Grade de 3 colunas (dia + quantidade em cada caixinha) — informação pequena, não precisa de
  // tabela de lista longa igual Atendimentos detalhados; pedido do Victor pra ficar mais compacto.
  const COLUNAS_STORIES = 3;
  const secaoStories =
    relatorio.storiesHabilitado && relatorio.storiesConectado
      ? `<tr><td style="background:#ffffff; padding:20px 24px 0;" bgcolor="#ffffff">
          <p style="margin:0 0 8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#71717a;">Stories publicados por dia</p>
          ${
            !relatorio.storiesPorDia || relatorio.storiesPorDia.length === 0
              ? `<p style="margin:0; font-size:13px; color:#71717a;">Nenhum Story publicado nesse período.</p>`
              : Array.from({ length: Math.ceil(relatorio.storiesPorDia.length / COLUNAS_STORIES) }, (_, linha) => {
                  const grupo = relatorio.storiesPorDia!.slice(linha * COLUNAS_STORIES, linha * COLUNAS_STORIES + COLUNAS_STORIES);
                  const celulas = grupo
                    .map(
                      (s, i) =>
                        `<td width="${Math.floor(100 / COLUNAS_STORIES)}%" style="padding:0 ${i < grupo.length - 1 ? "8px" : "0"} 8px 0;">
                          <div style="border:1px solid #e4e4e7; border-radius:8px; padding:6px 10px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                              <td style="font-size:12px; color:#52525b;">${formatarDataCurtaEmail(s.dataISO)}</td>
                              <td align="right" style="font-size:12px; font-weight:700; color:#18181b;">${s.total}</td>
                            </tr></table>
                          </div>
                        </td>`
                    )
                    .join("");
                  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${celulas}</tr></table>`;
                }).join("")
          }
        </td></tr>`
      : "";

  // `color-scheme`/`supported-color-schemes` travados em "only light" de propósito: sem isso, o
  // Apple Mail (confirmado no teste real do Único Sushi Bar) reinterpreta um e-mail de fundo escuro
  // como "feito pra modo claro" e reescreve as cores sozinho. Como o design agora já É claro
  // (pedido do Victor — "pode ser mais simples, fundo branco, uma tabela mesmo"), isso trava esse
  // fundo claro nas duas aparências (claro/escuro) do celular de quem recebe, sem o Apple Mail
  // tentando "ajudar" de novo.
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>Relatório — ${relatorio.contaNome}</title>
</head>
<body style="margin:0; padding:0; background:#f4f4f5;" bgcolor="#f4f4f5">
    <div style="background:#f4f4f5; padding:24px 16px; font-family:Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto;">
        <tr><td style="background:#4f46e5; padding:20px 24px; border-radius:16px 16px 0 0;" bgcolor="#4f46e5">
          <p style="margin:0; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#e0e7ff;">Relatório de desempenho</p>
          <h1 style="margin:4px 0 0; font-size:20px; color:#ffffff;">${relatorio.contaNome}</h1>
          <p style="margin:2px 0 0; font-size:13px; color:#c7d2fe;">${periodo}</p>
        </td></tr>
        <tr><td style="background:#ffffff; padding:20px 24px 0;" bgcolor="#ffffff">
          ${linhaDeQuadradinhos(quadradinhosPrincipais)}
        </td></tr>
        <tr><td style="background:#ffffff; padding:0 24px;" bgcolor="#ffffff">
          ${linhaDeQuadradinhos(quadradinhosSecundarios)}
        </td></tr>
        ${secaoStories}
        <tr><td style="background:#ffffff; padding:20px 24px 0;" bgcolor="#ffffff">
          <p style="margin:0 0 8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#71717a;">
            Atendimentos detalhados
          </p>
          <div style="border:1px solid #e4e4e7; border-radius:10px; overflow:hidden;">
            ${tabelaAtendimentos}
          </div>
        </td></tr>
        <tr><td style="background:#ffffff; padding:20px 24px 24px; border-radius:0 0 16px 16px;" bgcolor="#ffffff">
          <p style="margin:0; font-size:11px; color:#a1a1aa;">Relatório automático do Chatbot Direct.</p>
        </td></tr>
      </table>
    </div>
</body>
</html>`;

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
        subject: `Relatório — ${relatorio.contaNome} (${periodo})`,
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
