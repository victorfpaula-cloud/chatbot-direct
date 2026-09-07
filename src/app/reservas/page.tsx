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

// Mesma técnica de "cor estável por id" já usada nos avatares de /contas — cada cliente sempre
// cai na mesma cor, sem precisar guardar nada a mais no banco pra isso.
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

function hojeEmSaoPauloISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(data);
}

function formatarDataCompleta(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));

  // Só a primeira letra — o CSS `capitalize` deixaria "De Setembro" com D maiúsculo, já que ele
  // maiúsculiza a primeira letra de CADA palavra, não só a do começo da frase.
  return formatado.charAt(0).toUpperCase() + formatado.slice(1);
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
): Promise<{ id: string; page_name: string } | null> {
  const token = cookies().get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  if (!token) return null;

  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select("funcionario_id, chatbot_funcionarios(account_id, chatbot_accounts(id, page_name))")
    .eq("token", token)
    .maybeSingle();

  const conta = (sessao as any)?.chatbot_funcionarios?.chatbot_accounts;
  return conta ? { id: conta.id, page_name: conta.page_name } : null;
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
    : await admin.from("chatbot_accounts").select("id, page_name").order("created_at", { ascending: true });

  const contaSelecionada = ehFuncionario
    ? contaDoFuncionario
    : (todasAsContas ?? []).find((c) => c.id === searchParams.conta) ?? (todasAsContas ?? [])[0] ?? null;

  const hoje = hojeEmSaoPauloISO();
  const de = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.de ?? "") ? searchParams.de! : hoje;
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.ate ?? "") ? searchParams.ate! : somarDiasISO(hoje, 7);
  const filtroDePeriodo: FiltroDePeriodo = ["todos", "almoco", "jantar"].includes(searchParams.periodo ?? "")
    ? (searchParams.periodo as FiltroDePeriodo)
    : "todos";
  const busca = searchParams.busca?.trim() ?? "";

  let reservas: Reserva[] = [];
  let limiteMaximo: number | null = null;
  let historico: { data: string; total: number }[] = [];

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

  const rotuloDoPeriodo: Record<string, string> = {
    almoco: "Almoço",
    jantar: "Jantar",
    sem_periodo: "Sem período",
  };

  const totalDeReservas = reservas.length;
  const totalDePessoas = reservas.reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  const maiorDoHistorico = Math.max(1, ...historico.map((h) => h.total));

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Reservas</h1>
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
          {/* Stat strip — leitura rápida do que esse filtro está mostrando, sem precisar contar
              card por card. */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <p className="text-xs text-neutral-500">Reservas no período</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-100">{totalDeReservas}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <p className="text-xs text-neutral-500">Pessoas no período</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-100">{totalDePessoas}</p>
            </div>
          </div>

          {/* Atalhos de intervalo — um clique pras janelas mais usadas. */}
          <div className="mt-6 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <a
                key={preset.rotulo}
                href={href({ de: preset.de, ate: preset.ate })}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  de === preset.de && ate === preset.ate
                    ? "border-neutral-500 bg-neutral-900 text-neutral-100"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {preset.rotulo}
              </a>
            ))}
          </div>

          {/* Busca por nome + intervalo customizado — cobre o caso de querer uma data específica
              ou achar a reserva de um cliente pelo nome, igual a busca "NOME contém" da planilha
              antiga. */}
          <form method="GET" className="mt-3 flex flex-wrap items-end gap-3">
            {contaSelecionada && !ehFuncionario && (
              <input type="hidden" name="conta" value={contaSelecionada.id} />
            )}
            <div>
              <label className="text-xs text-neutral-500">Buscar por nome</label>
              <input
                type="text"
                name="busca"
                defaultValue={busca}
                placeholder="Nome ou @usuário"
                className="mt-1 w-40 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">De</label>
              <input
                type="date"
                name="de"
                defaultValue={de}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Até</label>
              <input
                type="date"
                name="ate"
                defaultValue={ate}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
              />
            </div>
            <input type="hidden" name="periodo" value={filtroDePeriodo} />
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-950"
            >
              Filtrar
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
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
                className={`rounded-lg border px-3 py-1 text-xs ${
                  filtro.valor === filtroDePeriodo
                    ? "border-neutral-500 bg-neutral-900 text-neutral-200"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600"
                }`}
              >
                {filtro.rotulo}
              </a>
            ))}
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
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                {formatarDataCompleta(data)}
                {ehHoje && (
                  <span className="rounded-full border border-sky-900 bg-sky-950 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                    Hoje
                  </span>
                )}
              </h2>

              <div className="mt-2 flex flex-col gap-4">
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
                  const corDaBarra =
                    percentual === null
                      ? "bg-neutral-600"
                      : percentual >= 100
                        ? "bg-red-500"
                        : percentual >= 70
                          ? "bg-amber-500"
                          : "bg-green-500";

                  return (
                    <div
                      key={periodo}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-md shadow-black/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-neutral-200">
                          {rotuloDoPeriodo[periodo] ?? periodo}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {totalDePessoasDoGrupo}
                          {typeof limiteMaximo === "number" ? ` / ${limiteMaximo}` : ""} pessoas
                        </span>
                      </div>

                      {percentual !== null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className={`h-full rounded-full ${corDaBarra}`}
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
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Histórico — últimos 14 dias
          </p>
          <svg
            role="img"
            aria-label="Reservas confirmadas por dia, nos últimos 14 dias"
            viewBox="0 0 336 72"
            className="mt-3 w-full"
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
