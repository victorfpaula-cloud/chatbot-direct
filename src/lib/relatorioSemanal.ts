import { criarClienteAdmin } from "@/lib/supabase/admin";
import { dataEmSaoPauloISO, limitesDaSemanaEmSaoPauloISO, somarDiasISO } from "@/lib/datas";

export type ResumoDoDia = { dataISO: string; rotulo: string; total: number };

export type AtendimentoDoRelatorio = {
  clienteNome: string | null;
  clienteUsername: string | null;
  criadoEm: string;
  status: string;
};

export type PublicacaoDeStoryDoRelatorio = {
  dataAgendada: string;
  status: string;
};

export type RelatorioSemanal = {
  contaId: string;
  contaNome: string;
  segundaISO: string;
  domingoISO: string;
  totalAtendimentos: number;
  totalMensagens: number;
  mensagensPorDia: ResumoDoDia[];
  atendimentos: AtendimentoDoRelatorio[];
  storiesHabilitado: boolean;
  storiesConectado: boolean;
  totalStoriesPublicados: number | null;
  totalStoriesComErro: number | null;
  publicacoesDeStories: PublicacaoDeStoryDoRelatorio[] | null;
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
 * Monta o relatório semanal (atendimentos, mensagens e — se a conta tiver o Agendador de Stories
 * — Stories publicados) de uma conta, pra uma semana civil de São Paulo (segunda a domingo).
 * Usado tanto pela tela de preview (/contas/[id]/relatorios) quanto pelo envio de e-mail (manual
 * ou pelo cron semanal) — um lugar só calculando os números, pra nunca a tela mostrar um valor e
 * o e-mail mandar outro.
 */
export async function montarRelatorioSemanal(
  admin: ReturnType<typeof criarClienteAdmin>,
  contaId: string,
  segundaISO: string
): Promise<RelatorioSemanal> {
  const domingoISO = somarDiasISO(segundaISO, 6);
  const { inicio, fim } = limitesDaSemanaEmSaoPauloISO(segundaISO);

  const [{ data: conta }, { data: config }, { data: atendimentosBrutos }] = await Promise.all([
    admin.from("chatbot_accounts").select("page_name, instagram_user_id").eq("id", contaId).maybeSingle(),
    admin.from("chatbot_account_settings").select("agendador_stories_habilitado").eq("account_id", contaId).maybeSingle(),
    admin
      .from("chatbot_atendimentos")
      .select("instagram_scoped_id, cliente_nome, cliente_username, criado_em, status")
      .eq("account_id", contaId)
      .gte("criado_em", inicio)
      .lt("criado_em", fim)
      .order("criado_em", { ascending: false }),
  ]);

  const atendimentos: AtendimentoDoRelatorio[] = (atendimentosBrutos ?? []).map((a) => ({
    clienteNome: a.cliente_nome,
    clienteUsername: a.cliente_username,
    criadoEm: a.criado_em,
    status: a.status,
  }));

  const totalMensagens = atendimentos.length;
  // "Atendimentos" = pessoas ÚNICAS (mesmo critério de sempre — ver /contas/[id]/atendimentos),
  // não linhas: uma pessoa pode ter trocado várias mensagens na mesma semana.
  const totalAtendimentos = new Set((atendimentosBrutos ?? []).map((a) => a.instagram_scoped_id)).size;

  const porDia = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    porDia.set(somarDiasISO(segundaISO, i), 0);
  }
  for (const a of atendimentos) {
    const dia = dataEmSaoPauloISO(a.criadoEm);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const mensagensPorDia: ResumoDoDia[] = Array.from(porDia.entries()).map(([dataISO, total]) => ({
    dataISO,
    rotulo: rotuloDoDia(dataISO),
    total,
  }));

  const storiesHabilitado = config?.agendador_stories_habilitado ?? false;
  let storiesConectado = false;
  let totalStoriesPublicados: number | null = null;
  let totalStoriesComErro: number | null = null;
  let publicacoesDeStories: PublicacaoDeStoryDoRelatorio[] | null = null;

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
        .gte("scheduled_for", segundaISO)
        .lte("scheduled_for", domingoISO)
        .order("scheduled_for", { ascending: false });

      publicacoesDeStories = (publicacoesBrutas ?? []).map((p) => ({
        dataAgendada: p.scheduled_for,
        status: p.status,
      }));
      totalStoriesPublicados = publicacoesDeStories.filter((p) => p.status === "success").length;
      totalStoriesComErro = publicacoesDeStories.filter((p) => p.status === "error").length;
    }
  }

  return {
    contaId,
    contaNome: conta?.page_name ?? "",
    segundaISO,
    domingoISO,
    totalAtendimentos,
    totalMensagens,
    mensagensPorDia,
    atendimentos,
    storiesHabilitado,
    storiesConectado,
    totalStoriesPublicados,
    totalStoriesComErro,
    publicacoesDeStories,
  };
}
