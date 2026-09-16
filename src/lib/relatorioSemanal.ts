import { criarClienteAdmin } from "@/lib/supabase/admin";
import { dataEmSaoPauloISO, limitesDoPeriodoEmSaoPauloISO, somarDiasISO } from "@/lib/datas";

export type ResumoDoDia = { dataISO: string; rotulo: string; total: number };

export type AtendimentoAgrupado = {
  clienteNome: string | null;
  clienteUsername: string | null;
  diaISO: string;
  horarioMensagem: string | null;
  horarioResposta: string;
  totalMensagens: number;
  teveErro: boolean;
};

export type StoriesPorDia = { dataISO: string; total: number };

export type Relatorio = {
  contaId: string;
  contaNome: string;
  inicioISO: string;
  fimISO: string;
  totalDias: number;
  totalAtendimentos: number;
  totalMensagens: number;
  mediaMensagensPorDia: number;
  diaComMaisMensagens: { dataISO: string; total: number } | null;
  totalComErro: number;
  // Segundos entre a mensagem chegar (mensagem_recebida_em) e a gente responder (criado_em) —
  // média só sobre atendimento respondido de verdade que já tem os dois horários (ver coluna
  // mensagem_recebida_em em chatbot_atendimentos: nasceu nula, só passa a vir preenchida a partir
  // de 16/09 — período que cair todo antes disso dá null aqui, não zero).
  tempoMedioDeRespostaSegundos: number | null;
  mensagensPorDia: ResumoDoDia[];
  atendimentos: AtendimentoAgrupado[];
  reservaHabilitada: boolean;
  totalReservas: number | null;
  totalPessoasReservas: number | null;
  storiesHabilitado: boolean;
  storiesConectado: boolean;
  totalStoriesPublicados: number | null;
  totalStoriesComErro: number | null;
  storiesPorDia: StoriesPorDia[] | null;
};

function rotuloDoDia(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const formatado = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(
    new Date(Date.UTC(ano, mes - 1, dia, 12))
  );
  // "seg.", "ter." etc — tira o ponto final pra ficar mais limpo no gráfico.
  return formatado.replace(".", "");
}

/**
 * Monta o relatório (atendimentos, mensagens, reservas e — se a conta tiver o Agendador de
 * Stories — Stories publicados) de uma conta, pra um período de dias civis de São Paulo
 * (`inicioISO`/`fimISO` inclusivos dos dois lados). Usado tanto pela tela de preview
 * (/contas/[id]/relatorios) quanto pelo envio de e-mail (manual ou pelo cron semanal) — um lugar
 * só calculando os números, pra nunca a tela mostrar um valor e o e-mail mandar outro.
 */
export async function montarRelatorio(
  admin: ReturnType<typeof criarClienteAdmin>,
  contaId: string,
  periodo: { inicioISO: string; fimISO: string }
): Promise<Relatorio> {
  const { inicioISO, fimISO } = periodo;
  const totalDias = Math.round((Date.parse(fimISO) - Date.parse(inicioISO)) / (24 * 60 * 60 * 1000)) + 1;
  const { inicio, fim } = limitesDoPeriodoEmSaoPauloISO(inicioISO, fimISO);

  const [{ data: conta }, { data: config }, { data: atendimentosBrutos }] = await Promise.all([
    admin.from("chatbot_accounts").select("page_name, instagram_user_id").eq("id", contaId).maybeSingle(),
    admin
      .from("chatbot_account_settings")
      .select("agendador_stories_habilitado, reserva_habilitada")
      .eq("account_id", contaId)
      .maybeSingle(),
    admin
      .from("chatbot_atendimentos")
      .select("instagram_scoped_id, cliente_nome, cliente_username, criado_em, mensagem_recebida_em, status")
      .eq("account_id", contaId)
      .gte("criado_em", inicio)
      .lt("criado_em", fim)
      .order("criado_em", { ascending: true }),
  ]);

  const totalMensagens = (atendimentosBrutos ?? []).length;
  // "Atendimentos" = pessoas ÚNICAS (mesmo critério de sempre — ver /contas/[id]/atendimentos),
  // não linhas: uma pessoa pode ter trocado várias mensagens no período.
  const totalAtendimentos = new Set((atendimentosBrutos ?? []).map((a) => a.instagram_scoped_id)).size;

  // Agrupado por cliente — "lista telefônica": uma linha por pessoa, com a primeira mensagem que
  // ela mandou no período e a resposta que demos pra ela (pra dar pra ver o tempo entre as duas),
  // mais quantas mensagens no total. A query já veio ordenada por criado_em ascendente, então a
  // PRIMEIRA linha de cada cliente que aparece é sempre a mais antiga dele no período.
  type LinhaAtendimento = NonNullable<typeof atendimentosBrutos>[number];
  type ClienteAgregado = {
    nome: string | null;
    username: string | null;
    primeira: LinhaAtendimento;
    total: number;
    teveErro: boolean;
  };

  const porCliente = new Map<string, ClienteAgregado>();
  for (const a of atendimentosBrutos ?? []) {
    const atual = porCliente.get(a.instagram_scoped_id);
    if (!atual) {
      porCliente.set(a.instagram_scoped_id, {
        nome: a.cliente_nome,
        username: a.cliente_username,
        primeira: a,
        total: 1,
        teveErro: a.status === "erro",
      });
    } else {
      atual.total += 1;
      if (a.status === "erro") atual.teveErro = true;
    }
  }

  const atendimentos: AtendimentoAgrupado[] = Array.from(porCliente.values())
    .map((c) => ({
      clienteNome: c.nome,
      clienteUsername: c.username,
      diaISO: dataEmSaoPauloISO(c.primeira.criado_em),
      horarioMensagem: c.primeira.mensagem_recebida_em,
      horarioResposta: c.primeira.criado_em,
      totalMensagens: c.total,
      teveErro: c.teveErro,
    }))
    // Mais recente primeiro, mesmo critério já usado na tela de Atendimentos.
    .sort((a, b) => (a.horarioResposta < b.horarioResposta ? 1 : -1));

  const porDia = new Map<string, number>();
  for (let i = 0; i < totalDias; i++) {
    porDia.set(somarDiasISO(inicioISO, i), 0);
  }
  for (const a of atendimentosBrutos ?? []) {
    const dia = dataEmSaoPauloISO(a.criado_em);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const mensagensPorDia: ResumoDoDia[] = Array.from(porDia.entries()).map(([dataISO, total]) => ({
    dataISO,
    rotulo: rotuloDoDia(dataISO),
    total,
  }));

  const mediaMensagensPorDia = Math.round((totalMensagens / totalDias) * 10) / 10;

  const diaComMaisMensagens = mensagensPorDia.reduce<{ dataISO: string; total: number } | null>(
    (melhor, dia) => (dia.total > 0 && (!melhor || dia.total > melhor.total) ? { dataISO: dia.dataISO, total: dia.total } : melhor),
    null
  );

  const totalComErro = (atendimentosBrutos ?? []).filter((a) => a.status === "erro").length;

  const temposDeResposta = (atendimentosBrutos ?? [])
    .filter((a) => a.status === "respondido" && a.mensagem_recebida_em)
    .map((a) => (Date.parse(a.criado_em) - Date.parse(a.mensagem_recebida_em as string)) / 1000)
    .filter((segundos) => segundos >= 0);

  const tempoMedioDeRespostaSegundos =
    temposDeResposta.length > 0
      ? Math.round(temposDeResposta.reduce((soma, s) => soma + s, 0) / temposDeResposta.length)
      : null;

  const reservaHabilitada = config?.reserva_habilitada ?? false;
  let totalReservas: number | null = null;
  let totalPessoasReservas: number | null = null;

  if (reservaHabilitada) {
    const { data: reservasBrutas } = await admin
      .from("chatbot_reservations")
      .select("quantidade_pessoas")
      .eq("account_id", contaId)
      .gte("confirmado_em", inicio)
      .lt("confirmado_em", fim);

    totalReservas = (reservasBrutas ?? []).length;
    totalPessoasReservas = (reservasBrutas ?? []).reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  }

  const storiesHabilitado = config?.agendador_stories_habilitado ?? false;
  let storiesConectado = false;
  let totalStoriesPublicados: number | null = null;
  let totalStoriesComErro: number | null = null;
  let storiesPorDia: StoriesPorDia[] | null = null;

  if (storiesHabilitado && conta?.instagram_user_id) {
    const { data: contaStories } = await admin
      .from("accounts")
      .select("id")
      .eq("ig_user_id", conta.instagram_user_id)
      .maybeSingle();

    if (contaStories) {
      storiesConectado = true;
      const { data: publicacoesBrutas } = await admin
        .from("publish_log")
        .select("scheduled_for, status")
        .eq("account_id", contaStories.id)
        .gte("scheduled_for", inicioISO)
        .lte("scheduled_for", fimISO);

      totalStoriesPublicados = (publicacoesBrutas ?? []).filter((p) => p.status === "success").length;
      totalStoriesComErro = (publicacoesBrutas ?? []).filter((p) => p.status === "error").length;

      const diasComStories = new Map<string, number>();
      for (const p of publicacoesBrutas ?? []) {
        if (p.status !== "success") continue;
        diasComStories.set(p.scheduled_for, (diasComStories.get(p.scheduled_for) ?? 0) + 1);
      }
      storiesPorDia = Array.from(diasComStories.entries())
        .map(([dataISO, total]) => ({ dataISO, total }))
        .sort((a, b) => (a.dataISO < b.dataISO ? 1 : -1));
    }
  }

  return {
    contaId,
    contaNome: conta?.page_name ?? "",
    inicioISO,
    fimISO,
    totalDias,
    totalAtendimentos,
    totalMensagens,
    mediaMensagensPorDia,
    diaComMaisMensagens,
    totalComErro,
    tempoMedioDeRespostaSegundos,
    mensagensPorDia,
    atendimentos,
    reservaHabilitada,
    totalReservas,
    totalPessoasReservas,
    storiesHabilitado,
    storiesConectado,
    totalStoriesPublicados,
    totalStoriesComErro,
    storiesPorDia,
  };
}
