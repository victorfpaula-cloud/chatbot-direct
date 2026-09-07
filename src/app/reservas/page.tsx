import { cookies } from "next/headers";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios-cookie";
import { BotaoSair } from "@/app/contas/BotaoSair";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Reserva = {
  id: string;
  instagram_scoped_id: string;
  cliente_nome: string | null;
  cliente_instagram_username: string | null;
  data_reserva: string;
  periodo: string | null;
  quantidade_pessoas: number | null;
  whatsapp: string | null;
  confirmado_em: string;
};

type FiltroDePeriodo = "todos" | "almoco" | "jantar";

// --- Ícones (mesmo estilo de traço já usado no botão de sair e no link de WhatsApp) ---

function Icone({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const CAMINHO_CALENDARIO = "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z";
const CAMINHO_PESSOAS =
  "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75";
const CAMINHO_TICKET =
  "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z";
const CAMINHO_FUNIL = "M22 3H2l8 9.46V19l4 2v-8.54L22 3z";
const CAMINHO_RELOGIO_HISTORICO = "M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8";
const CAMINHO_SOL =
  "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42";
const CAMINHO_LUA = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";

// --- Estilo por cliente/dia ---

const CORES_DE_AVATAR = [
  "bg-emerald-950 text-emerald-300",
  "bg-sky-950 text-sky-300",
  "bg-amber-950 text-amber-300",
  "bg-fuchsia-950 text-fuchsia-300",
  "bg-rose-950 text-rose-300",
];

function corDoAvatar(id: string): string {
  let soma = 0;
  for (const caractere of id) soma += caractere.charCodeAt(0);
  return CORES_DE_AVATAR[soma % CORES_DE_AVATAR.length];
}

const ESTILO_DO_PERIODO: Record<string, { rotulo: string; caminho: string; cor: string }> = {
  almoco: { rotulo: "Almoço", caminho: CAMINHO_SOL, cor: "bg-amber-950 text-amber-300 border-amber-900/60" },
  jantar: { rotulo: "Jantar", caminho: CAMINHO_LUA, cor: "bg-indigo-950 text-indigo-300 border-indigo-900/60" },
};

function estiloDoPeriodo(periodo: string) {
  return ESTILO_DO_PERIODO[periodo] ?? { rotulo: periodo, caminho: CAMINHO_TICKET, cor: "bg-neutral-800 text-neutral-300 border-neutral-700" };
}

// --- Datas ---

function hojeEmSaoPauloISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(data);
}

function primeiraLetraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataExtensa(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
  return primeiraLetraMaiuscula(formatado);
}

function formatarDataCurta(dataISO: string): string {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

function formatarHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Link de WhatsApp a partir do que o cliente digitou — assume DDI 55 (Brasil) quando o número
 * já não vem com um (10-11 dígitos é DDD+número, sem DDI). */
function linkDoWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const comDDI = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${comDDI}`;
}

async function resolverContaDoFuncionario(
  admin: ReturnType<typeof criarClienteAdmin>
): Promise<{ id: string; page_name: string; instagram_username: string | null } | null> {
  const token = cookies().get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  if (!token) return null;

  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select(
      "funcionario_id, chatbot_funcionarios(account_id, chatbot_accounts(id, page_name, instagram_username))"
    )
    .eq("token", token)
    .maybeSingle();

  const conta = (sessao as any)?.chatbot_funcionarios?.chatbot_accounts;
  return conta ? { id: conta.id, page_name: conta.page_name, instagram_username: conta.instagram_username } : null;
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: { conta?: string; de?: string; ate?: string; periodo?: string; busca?: string };
}) {
  const admin = criarClienteAdmin();

  const contaDoFuncionario = await resolverContaDoFuncionario(admin);
  const ehFuncionario = contaDoFuncionario !== null;

  const { data: todasAsContas } = ehFuncionario
    ? { data: null }
    : await admin
        .from("chatbot_accounts")
        .select("id, page_name, instagram_username")
        .order("created_at", { ascending: true });

  const contaSelecionada = ehFuncionario
    ? contaDoFuncionario
    : (todasAsContas ?? []).find((c) => c.id === searchParams.conta) ?? (todasAsContas ?? [])[0] ?? null;

  const hoje = hojeEmSaoPauloISO();
  const de = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.de ?? "") ? searchParams.de! : hoje;
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.ate ?? "") ? searchParams.ate! : hoje;
  const filtroDePeriodo: FiltroDePeriodo = ["todos", "almoco", "jantar"].includes(searchParams.periodo ?? "")
    ? (searchParams.periodo as FiltroDePeriodo)
    : "todos";
  const busca = searchParams.busca?.trim() ?? "";

  let reservas: Reserva[] = [];
  let limiteMaximo: number | null = null;
  let historico: { data: string; total: number }[] = [];
  let totalDeReservasNoAno = 0;
  let totalDePessoasNoAno = 0;

  if (contaSelecionada) {
    let consulta = admin
      .from("chatbot_reservations")
      .select(
        "id, instagram_scoped_id, cliente_nome, cliente_instagram_username, data_reserva, periodo, quantidade_pessoas, whatsapp, confirmado_em"
      )
      .eq("account_id", contaSelecionada.id)
      .gte("data_reserva", de)
      .lte("data_reserva", ate)
      .order("data_reserva", { ascending: true })
      .order("periodo", { ascending: true })
      .order("confirmado_em", { ascending: true });

    if (filtroDePeriodo !== "todos") {
      consulta = consulta.eq("periodo", filtroDePeriodo);
    }
    if (busca) {
      // Tira vírgula e parênteses — o filtro `.or()` do PostgREST usa esses caracteres como
      // separador de condição, então sem isso um nome de cliente com vírgula quebraria a busca.
      const buscaSegura = busca.replace(/[,()]/g, "");
      if (buscaSegura) {
        consulta = consulta.or(
          `cliente_nome.ilike.%${buscaSegura}%,cliente_instagram_username.ilike.%${buscaSegura}%`
        );
      }
    }

    const { data } = await consulta;
    reservas = data ?? [];

    const { data: config } = await admin
      .from("chatbot_account_settings")
      .select("reserva_limite_maximo")
      .eq("account_id", contaSelecionada.id)
      .maybeSingle();
    limiteMaximo = config?.reserva_limite_maximo ?? null;

    const inicioHistorico = somarDiasISO(hoje, -13);
    const { data: historicoRaw } = await admin
      .from("chatbot_reservations")
      .select("data_reserva")
      .eq("account_id", contaSelecionada.id)
      .gte("data_reserva", inicioHistorico)
      .lte("data_reserva", hoje);

    const contagemPorDia = new Map<string, number>();
    for (const linha of historicoRaw ?? []) {
      contagemPorDia.set(linha.data_reserva, (contagemPorDia.get(linha.data_reserva) ?? 0) + 1);
    }
    for (let i = 0; i < 14; i++) {
      const dia = somarDiasISO(inicioHistorico, i);
      historico.push({ data: dia, total: contagemPorDia.get(dia) ?? 0 });
    }

    const anoAtual = hoje.slice(0, 4);
    const { data: doAno } = await admin
      .from("chatbot_reservations")
      .select("quantidade_pessoas")
      .eq("account_id", contaSelecionada.id)
      .gte("data_reserva", `${anoAtual}-01-01`)
      .lte("data_reserva", `${anoAtual}-12-31`);
    totalDeReservasNoAno = doAno?.length ?? 0;
    totalDePessoasNoAno = (doAno ?? []).reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  }

  const porData = new Map<string, Map<string, Reserva[]>>();
  for (const reserva of reservas) {
    const grupoDeData = porData.get(reserva.data_reserva) ?? new Map<string, Reserva[]>();
    const chaveDePeriodo = reserva.periodo ?? "sem_periodo";
    const grupoDePeriodo = grupoDeData.get(chaveDePeriodo) ?? [];
    grupoDePeriodo.push(reserva);
    grupoDeData.set(chaveDePeriodo, grupoDePeriodo);
    porData.set(reserva.data_reserva, grupoDeData);
  }
  const datasOrdenadas = Array.from(porData.keys()).sort();

  const totalDeReservas = reservas.length;
  const totalDePessoas = reservas.reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  const maiorDoHistorico = Math.max(1, ...historico.map((h) => h.total));
  const ehSomenteHoje = de === hoje && ate === hoje;
  const rotuloDoEscopo = ehSomenteHoje ? "hoje" : "no período";

  function href(sobrescreve: Partial<{ conta: string; de: string; ate: string; periodo: string; busca: string }>) {
    const params = new URLSearchParams();
    const contaAtual = sobrescreve.conta ?? contaSelecionada?.id;
    if (contaAtual) params.set("conta", contaAtual);
    params.set("de", sobrescreve.de ?? de);
    params.set("ate", sobrescreve.ate ?? ate);
    params.set("periodo", sobrescreve.periodo ?? filtroDePeriodo);
    const buscaFinal = sobrescreve.busca ?? busca;
    if (buscaFinal) params.set("busca", buscaFinal);
    return `/reservas?${params.toString()}`;
  }

  const presets: { rotulo: string; de: string; ate: string }[] = [
    { rotulo: "Hoje", de: hoje, ate: hoje },
    { rotulo: "Amanhã", de: somarDiasISO(hoje, 1), ate: somarDiasISO(hoje, 1) },
    { rotulo: "Próximos 7 dias", de: hoje, ate: somarDiasISO(hoje, 7) },
    { rotulo: "Próximos 30 dias", de: hoje, ate: somarDiasISO(hoje, 30) },
  ];

  const hrefReservasAntigas = href({ de: somarDiasISO(hoje, -365), ate: somarDiasISO(hoje, -1) });
  const filtroPersonalizadoAtivo = !ehSomenteHoje || busca.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-100">
            <Icone path={CAMINHO_TICKET} className="h-5 w-5 text-sky-400" />
            Reservas
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {contaSelecionada ? contaSelecionada.page_name : "Nenhuma conta disponível"}
          </p>
        </div>

        {ehFuncionario ? (
          <form action="/api/reservas/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            >
              Sair
            </button>
          </form>
        ) : (
          <BotaoSair />
        )}
      </div>

      {/* Data de hoje, sempre em destaque — funcionário e admin */}
      <div className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
        <Icone path={CAMINHO_CALENDARIO} className="h-4 w-4 text-sky-400" />
        Hoje é <span className="font-medium text-neutral-100">{formatarDataExtensa(hoje)}</span>
      </div>

      {/* Boas-vindas — só pra tela do funcionário, o Victor já sabe onde está */}
      {ehFuncionario && contaSelecionada && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-950 via-neutral-900 to-neutral-900 p-5 shadow-lg shadow-black/30">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Painel da equipe</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-50">
            Bem-vindo às reservas do{" "}
            {contaSelecionada.instagram_username ? `@${contaSelecionada.instagram_username}` : contaSelecionada.page_name}
          </h2>
        </div>
      )}

      {!ehFuncionario && (todasAsContas ?? []).length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(todasAsContas ?? []).map((conta) => (
            <a
              key={conta.id}
              href={href({ conta: conta.id })}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                conta.id === contaSelecionada?.id
                  ? "border-neutral-500 bg-neutral-900 text-neutral-100"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {conta.page_name}
            </a>
          ))}
        </div>
      )}

      {contaSelecionada && (
        <>
          {/* Filtros — presets de data e busca por nome ficam discretos dentro do dropdown;
              período e "reservas antigas" continuam visíveis por serem os mais usados. */}
          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 [&::-webkit-details-marker]:hidden hover:border-neutral-500">
                <Icone path={CAMINHO_FUNIL} className="h-3.5 w-3.5" />
                Filtros
                {filtroPersonalizadoAtivo && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
              </summary>

              <div className="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 shadow-xl shadow-black/40">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Intervalo rápido</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <a
                      key={preset.rotulo}
                      href={href({ de: preset.de, ate: preset.ate })}
                      className={`rounded-lg border px-2.5 py-1 text-xs ${
                        de === preset.de && ate === preset.ate
                          ? "border-sky-700 bg-sky-950 text-sky-200"
                          : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                      }`}
                    >
                      {preset.rotulo}
                    </a>
                  ))}
                </div>

                <form method="GET" className="mt-4 flex flex-col gap-3 border-t border-neutral-800 pt-4">
                  {!ehFuncionario && <input type="hidden" name="conta" value={contaSelecionada.id} />}
                  <input type="hidden" name="periodo" value={filtroDePeriodo} />

                  <div>
                    <label className="text-xs text-neutral-500">Buscar por nome</label>
                    <input
                      type="text"
                      name="busca"
                      defaultValue={busca}
                      placeholder="Nome ou @usuário"
                      className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500">De</label>
                      <input
                        type="date"
                        name="de"
                        defaultValue={de}
                        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500">Até</label>
                      <input
                        type="date"
                        name="ate"
                        defaultValue={ate}
                        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-700 bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-950"
                  >
                    Aplicar filtros
                  </button>
                </form>
              </div>
            </details>

            <a
              href={hrefReservasAntigas}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500"
            >
              <Icone path={CAMINHO_RELOGIO_HISTORICO} className="h-3.5 w-3.5" />
              Reservas antigas
            </a>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { valor: "todos", rotulo: "Almoço e jantar" },
                  { valor: "almoco", rotulo: "Só almoço" },
                  { valor: "jantar", rotulo: "Só jantar" },
                ] as { valor: FiltroDePeriodo; rotulo: string }[]
              ).map((filtro) => (
                <a
                  key={filtro.valor}
                  href={href({ periodo: filtro.valor })}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    filtro.valor === filtroDePeriodo
                      ? "border-neutral-500 bg-neutral-900 text-neutral-100"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {filtro.rotulo}
                </a>
              ))}
            </div>
          </div>

          {/* Stat cards — logo acima da lista, com destaque colorido, igual pedido */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-sky-900/50 bg-gradient-to-br from-sky-950/60 to-neutral-900 px-4 py-3 shadow-sm shadow-sky-950/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-950 text-sky-300">
                <Icone path={CAMINHO_TICKET} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Reservas {rotuloDoEscopo}</p>
                <p className="text-2xl font-semibold text-neutral-50">{totalDeReservas}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-violet-900/50 bg-gradient-to-br from-violet-950/60 to-neutral-900 px-4 py-3 shadow-sm shadow-violet-950/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-950 text-violet-300">
                <Icone path={CAMINHO_PESSOAS} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Pessoas {rotuloDoEscopo}</p>
                <p className="text-2xl font-semibold text-neutral-50">{totalDePessoas}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {!contaSelecionada && (
        <p className="mt-8 text-sm text-neutral-500">Nenhuma conta conectada ainda.</p>
      )}

      {contaSelecionada && datasOrdenadas.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
          Nenhuma reserva encontrada nesse filtro.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {datasOrdenadas.map((data) => {
          const grupoDeData = porData.get(data)!;
          const periodosOrdenados = Array.from(grupoDeData.keys()).sort();
          const ehHoje = data === hoje;

          return (
            <div key={data}>
              {/* Cabeçalho do dia com bem mais destaque — é a informação mais importante da tela */}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  ehHoje
                    ? "border-sky-800/60 bg-sky-950/40"
                    : "border-neutral-800 bg-neutral-900/60"
                }`}
              >
                <Icone
                  path={CAMINHO_CALENDARIO}
                  className={`h-4 w-4 shrink-0 ${ehHoje ? "text-sky-400" : "text-neutral-500"}`}
                />
                <h2 className={`text-base font-semibold ${ehHoje ? "text-sky-100" : "text-neutral-200"}`}>
                  {formatarDataExtensa(data)}
                </h2>
                {ehHoje && (
                  <span className="rounded-full border border-sky-700 bg-sky-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                    Hoje
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-4">
                {periodosOrdenados.map((periodo) => {
                  const reservasDoPeriodo = grupoDeData.get(periodo)!;
                  const totalDePessoasDoGrupo = reservasDoPeriodo.reduce(
                    (soma, r) => soma + (r.quantidade_pessoas ?? 0),
                    0
                  );
                  const percentual =
                    typeof limiteMaximo === "number" && limiteMaximo > 0
                      ? Math.min(100, Math.round((totalDePessoasDoGrupo / limiteMaximo) * 100))
                      : null;
                  const status =
                    percentual === null
                      ? { barra: "bg-neutral-600", borda: "border-neutral-800" }
                      : percentual >= 100
                        ? { barra: "bg-red-500", borda: "border-red-900/60" }
                        : percentual >= 70
                          ? { barra: "bg-amber-500", borda: "border-amber-900/60" }
                          : { barra: "bg-green-500", borda: "border-green-900/50" };
                  const estiloPeriodo = estiloDoPeriodo(periodo);

                  return (
                    <div
                      key={periodo}
                      className={`rounded-2xl border-2 bg-neutral-900 p-4 shadow-md shadow-black/20 ${status.borda}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${estiloPeriodo.cor}`}
                        >
                          <Icone path={estiloPeriodo.caminho} className="h-3.5 w-3.5" />
                          {estiloPeriodo.rotulo}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-neutral-400">
                          <Icone path={CAMINHO_PESSOAS} className="h-3.5 w-3.5" />
                          {totalDePessoasDoGrupo}
                          {typeof limiteMaximo === "number" ? ` / ${limiteMaximo}` : ""} pessoas
                        </span>
                      </div>

                      {percentual !== null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className={`h-full rounded-full ${status.barra}`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      )}

                      <div className="mt-4 flex flex-col gap-2">
                        {reservasDoPeriodo.map((reserva) => (
                          <div
                            key={reserva.id}
                            className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${corDoAvatar(
                                reserva.id
                              )}`}
                            >
                              {(reserva.cliente_nome ?? "C").charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-1.5">
                                <span className="truncate text-sm font-medium text-neutral-100">
                                  {reserva.cliente_nome ?? "Cliente"}
                                </span>
                                {reserva.cliente_instagram_username && (
                                  <a
                                    href={`https://instagram.com/${reserva.cliente_instagram_username}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-neutral-500 hover:text-neutral-300"
                                  >
                                    @{reserva.cliente_instagram_username}
                                  </a>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                                {reserva.whatsapp && (
                                  <a
                                    href={linkDoWhatsapp(reserva.whatsapp)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 hover:text-neutral-300"
                                  >
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="shrink-0"
                                    >
                                      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 3.15L3 21" />
                                    </svg>
                                    {reserva.whatsapp}
                                  </a>
                                )}
                                <span>confirmada às {formatarHora(reserva.confirmado_em)}</span>
                              </div>
                            </div>

                            <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-200">
                              {reserva.quantidade_pessoas ?? "—"} pessoa
                              {reserva.quantidade_pessoas === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {contaSelecionada && (
        <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Icone path={CAMINHO_RELOGIO_HISTORICO} className="h-3.5 w-3.5" />
            Histórico e totais do ano
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <p className="text-xs text-neutral-500">Reservas em {hoje.slice(0, 4)}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-100">{totalDeReservasNoAno}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <p className="text-xs text-neutral-500">Pessoas atendidas em {hoje.slice(0, 4)}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-100">{totalDePessoasNoAno}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-500">Reservas confirmadas por dia — últimos 14 dias</p>
          <svg
            role="img"
            aria-label="Reservas confirmadas por dia, nos últimos 14 dias"
            viewBox="0 0 336 72"
            className="mt-2 w-full"
            preserveAspectRatio="none"
          >
            <line x1="0" y1="64" x2="336" y2="64" stroke="#2c2c2a" strokeWidth="1" />
            {historico.map((dia, i) => {
              const altura = dia.total === 0 ? 0 : Math.max(4, Math.round((dia.total / maiorDoHistorico) * 56));
              const x = i * 24 + 2;
              return (
                <rect key={dia.data} x={x} y={64 - altura} width="20" height={altura} rx="3" fill="#3987e5">
                  <title>
                    {formatarDataCurta(dia.data)}: {dia.total} reserva{dia.total === 1 ? "" : "s"}
                  </title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-neutral-600">
            <span>{formatarDataCurta(historico[0]?.data ?? hoje)}</span>
            <span>{formatarDataCurta(historico[historico.length - 1]?.data ?? hoje)}</span>
          </div>
        </div>
      )}
    </main>
  );
}
