import { criarClienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const LIMITE_DE_LINHAS = 300;

type LinhaDoLog = {
  id: string;
  cliente_nome: string | null;
  autor: string;
  acao: string;
  detalhe: string;
  criado_em: string;
};

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Só a tela do Victor tem link pra cá (/reservas/page.tsx) — nenhum funcionário chega nessa
// página nem vendo a URL na mão, porque ela não está na lista de rotas que aceitam sessão de
// funcionário (ver src/middleware.ts: cai no ramo que exige a sessão normal do Supabase Auth).
export default async function LogDeReservasPage({
  searchParams,
}: {
  searchParams: { conta?: string };
}) {
  const admin = criarClienteAdmin();

  const { data: todasAsContas } = await admin
    .from("chatbot_accounts")
    .select("id, page_name")
    .order("created_at", { ascending: true });

  const contaSelecionada =
    (todasAsContas ?? []).find((c) => c.id === searchParams.conta) ?? (todasAsContas ?? [])[0] ?? null;

  const { data: log } = contaSelecionada
    ? await admin
        .from("chatbot_reservas_log")
        .select("id, cliente_nome, autor, acao, detalhe, criado_em")
        .eq("account_id", contaSelecionada.id)
        .order("criado_em", { ascending: false })
        .limit(LIMITE_DE_LINHAS)
    : { data: [] };

  const linhas: LinhaDoLog[] = log ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <a href="/reservas" className="text-sm text-neutral-400 hover:text-neutral-300">
        &larr; Voltar pras reservas
      </a>

      <h1 className="mt-4 text-2xl font-semibold text-neutral-100">Log de alterações</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Toda edição de quantidade de pessoas e toda exclusão de reserva feitas direto em /reservas
        — por você ou por um funcionário — ficam registradas aqui. Últimas {LIMITE_DE_LINHAS}.
      </p>

      {(todasAsContas ?? []).length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(todasAsContas ?? []).map((conta) => (
            <a
              key={conta.id}
              href={`/reservas/log?conta=${conta.id}`}
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

      <div className="mt-6 flex flex-col gap-2">
        {linhas.map((linha) => (
          <div
            key={linha.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-neutral-100">
                {linha.cliente_nome ?? "Cliente"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  linha.acao === "excluido"
                    ? "border-red-900 bg-red-950 text-red-300"
                    : "border-amber-900 bg-amber-950 text-amber-300"
                }`}
              >
                {linha.acao === "excluido" ? "Excluído" : "Editado"}
              </span>
            </div>
            <p className="mt-1 text-neutral-300">{linha.detalhe}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {linha.autor} · {formatarDataHora(linha.criado_em)}
            </p>
          </div>
        ))}

        {linhas.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
            Nenhuma alteração registrada ainda.
          </p>
        )}
      </div>
    </main>
  );
}
