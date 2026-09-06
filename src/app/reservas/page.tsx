import { cookies } from "next/headers";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios";
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

type Intervalo = "hoje" | "amanha" | "semana" | "todas";
type FiltroDePeriodo = "todos" | "almoco" | "jantar";

function hojeEmSaoPauloISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(data);
}

function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-");
  const nomeDoDia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia))));
  return `${dia}/${mes} · ${nomeDoDia}`;
}

function formatarHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
  searchParams: { conta?: string; intervalo?: string; periodo?: string };
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

  const intervalo: Intervalo = ["hoje", "amanha", "semana", "todas"].includes(searchParams.intervalo ?? "")
    ? (searchParams.intervalo as Intervalo)
    : "semana";
  const filtroDePeriodo: FiltroDePeriodo = ["todos", "almoco", "jantar"].includes(searchParams.periodo ?? "")
    ? (searchParams.periodo as FiltroDePeriodo)
    : "todos";

  let reservas: Reserva[] = [];
  let limiteMaximo: number | null = null;

  if (contaSelecionada) {
    const hoje = hojeEmSaoPauloISO();

    let consulta = admin
      .from("chatbot_reservations")
      .select(
        "id, instagram_scoped_id, cliente_nome, cliente_instagram_username, data_reserva, periodo, quantidade_pessoas, whatsapp, confirmado_em"
      )
      .eq("account_id", contaSelecionada.id)
      .gte("data_reserva", hoje)
      .order("data_reserva", { ascending: true })
      .order("periodo", { ascending: true })
      .order("confirmado_em", { ascending: true });

    if (intervalo === "hoje") {
      consulta = consulta.eq("data_reserva", hoje);
    } else if (intervalo === "amanha") {
      consulta = consulta.eq("data_reserva", somarDiasISO(hoje, 1));
    } else if (intervalo === "semana") {
      consulta = consulta.lte("data_reserva", somarDiasISO(hoje, 7));
    }

    if (filtroDePeriodo !== "todos") {
      consulta = consulta.eq("periodo", filtroDePeriodo);
    }

    const { data } = await consulta;
    reservas = data ?? [];

    const { data: config } = await admin
      .from("chatbot_account_settings")
      .select("reserva_limite_maximo")
      .eq("account_id", contaSelecionada.id)
      .maybeSingle();
    limiteMaximo = config?.reserva_limite_maximo ?? null;
  }

  // Agrupa por data e, dentro de cada data, por período — pra mostrar a capacidade (soma de
  // pessoas) de cada dia+período junto, do mesmo jeito que o limite de reserva é calculado.
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

  const filtrosDeIntervalo: { valor: Intervalo; rotulo: string }[] = [
    { valor: "hoje", rotulo: "Hoje" },
    { valor: "amanha", rotulo: "Amanhã" },
    { valor: "semana", rotulo: "Próximos 7 dias" },
    { valor: "todas", rotulo: "Todas futuras" },
  ];

  const filtrosDePeriodo: { valor: FiltroDePeriodo; rotulo: string }[] = [
    { valor: "todos", rotulo: "Almoço e jantar" },
    { valor: "almoco", rotulo: "Só almoço" },
    { valor: "jantar", rotulo: "Só jantar" },
  ];

  function href(sobrescreve: Partial<{ conta: string; intervalo: string; periodo: string }>) {
    const params = new URLSearchParams();
    const contaAtual = sobrescreve.conta ?? contaSelecionada?.id;
    if (contaAtual) params.set("conta", contaAtual);
    params.set("intervalo", sobrescreve.intervalo ?? intervalo);
    params.set("periodo", sobrescreve.periodo ?? filtroDePeriodo);
    return `/reservas?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reservas</h1>
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

      <div className="mt-6 flex flex-wrap gap-2">
        {filtrosDeIntervalo.map((filtro) => (
          <a
            key={filtro.valor}
            href={href({ intervalo: filtro.valor })}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filtro.valor === intervalo
                ? "border-neutral-500 bg-neutral-900 text-neutral-100"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
            }`}
          >
            {filtro.rotulo}
          </a>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {filtrosDePeriodo.map((filtro) => (
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

      {!contaSelecionada && (
        <p className="mt-8 text-sm text-neutral-500">Nenhuma conta conectada ainda.</p>
      )}

      {contaSelecionada && datasOrdenadas.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
          Nenhuma reserva encontrada nesse período.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {datasOrdenadas.map((data) => {
          const grupoDeData = porData.get(data)!;
          const periodosOrdenados = Array.from(grupoDeData.keys()).sort();

          return (
            <div key={data}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {formatarDataBR(data)}
              </h2>

              <div className="mt-2 flex flex-col gap-3">
                {periodosOrdenados.map((periodo) => {
                  const reservasDoPeriodo = grupoDeData.get(periodo)!;
                  const totalDePessoas = reservasDoPeriodo.reduce(
                    (soma, r) => soma + (r.quantidade_pessoas ?? 0),
                    0
                  );

                  return (
                    <div
                      key={periodo}
                      className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-200">
                          {rotuloDoPeriodo[periodo] ?? periodo}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {totalDePessoas}
                          {typeof limiteMaximo === "number" ? ` de ${limiteMaximo}` : ""} pessoas
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {reservasDoPeriodo.map((reserva) => (
                          <div
                            key={reserva.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-neutral-100">
                                {reserva.cliente_nome ?? "Cliente"}
                              </span>
                              {reserva.cliente_instagram_username && (
                                <span className="ml-1.5 text-neutral-500">
                                  @{reserva.cliente_instagram_username}
                                </span>
                              )}
                              {reserva.whatsapp && (
                                <span className="ml-1.5 text-neutral-500">· {reserva.whatsapp}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                              <span>
                                {reserva.quantidade_pessoas ?? "—"} pessoa
                                {reserva.quantidade_pessoas === 1 ? "" : "s"}
                              </span>
                              <span>confirmada {formatarHora(reserva.confirmado_em)}</span>
                            </div>
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
    </main>
  );
}
