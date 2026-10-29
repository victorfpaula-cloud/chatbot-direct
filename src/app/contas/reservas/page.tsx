import Link from "next/link";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { hojeEmSaoPauloISO, somarDiasISO } from "@/lib/datas";
import { CLASSE_SECAO, CLASSE_TITULO_SECAO } from "../[id]/estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Visão "admin master" pedida pelo Victor (29/10/2026): hoje, pra ver as reservas de uma conta
// ele precisa logar como funcionário DAQUELA conta especificamente (/reservas/login é um sistema
// de login separado, por conta — ver src/lib/funcionarios.ts). Com duas contas usando Reserva já
// virou chato trocar de login o tempo todo só pra conferir. Essa tela não precisa de nenhum login
// novo: já mora dentro de /contas, que o middleware já protege com a sessão do Victor (Supabase
// Auth) — ele só abre um link a mais, sem senha nenhuma pra criar/lembrar.
//
// De propósito SÓ LEITURA e SEM as ações do painel operacional (/reservas — confirmar presença,
// editar, excluir, notificação push): aquilo é pra equipe de cada restaurante no dia a dia; isso
// aqui é só pra visão geral "o que tem marcado hoje, em qualquer lugar" — pedido como "bem fácil
// de visualizar", não como substituto do painel de cada conta.

type ReservaDoDia = {
  id: string;
  cliente_nome: string | null;
  cliente_instagram_username: string | null;
  periodo: string | null;
  quantidade_pessoas: number | null;
  whatsapp: string | null;
  confirmado_em: string;
};

function rotuloDoPeriodo(periodo: string | null): string {
  if (periodo === "almoco") return "Almoço";
  if (periodo === "jantar") return "Jantar";
  // Modo "horário livre" (ver src/lib/reservas.ts) — periodo já É o horário escolhido, ex: "20:00".
  return periodo ?? "—";
}

// Chave de ordenação dentro do dia: "almoco" antes de "jantar", e um horário livre (ex: "20:00")
// ordena pela hora de verdade — tudo como string comparável, sem precisar de Date.
function chaveDeOrdenacao(periodo: string | null): string {
  if (periodo === "almoco") return "0";
  if (periodo === "jantar") return "2";
  return /^\d{2}:\d{2}$/.test(periodo ?? "") ? `1${periodo}` : "9";
}

function formatarDataParaRotulo(dataISO: string, hojeISO: string): string {
  if (dataISO === hojeISO) return "Hoje";
  if (dataISO === somarDiasISO(hojeISO, 1)) return "Amanhã";
  if (dataISO === somarDiasISO(hojeISO, -1)) return "Ontem";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function ReservasMasterPage({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  const hojeISO = hojeEmSaoPauloISO();
  const dataSelecionada = searchParams.data && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data) ? searchParams.data : hojeISO;

  const admin = criarClienteAdmin();

  const [{ data: contas }, { data: settingsComReserva }] = await Promise.all([
    admin.from("chatbot_accounts").select("id, page_name").eq("active", true),
    admin.from("chatbot_account_settings").select("account_id").eq("reserva_habilitada", true),
  ]);

  const idsComReserva = new Set((settingsComReserva ?? []).map((s) => s.account_id));
  const contasComReserva = (contas ?? [])
    .filter((c) => idsComReserva.has(c.id))
    .sort((a, b) => a.page_name.localeCompare(b.page_name, "pt-BR"));

  const reservasPorConta = new Map<string, ReservaDoDia[]>();
  if (contasComReserva.length > 0) {
    const { data: reservas } = await admin
      .from("chatbot_reservations")
      .select("id, account_id, cliente_nome, cliente_instagram_username, periodo, quantidade_pessoas, whatsapp, confirmado_em")
      .in("account_id", contasComReserva.map((c) => c.id))
      .eq("data_reserva", dataSelecionada);

    for (const r of reservas ?? []) {
      const lista = reservasPorConta.get(r.account_id) ?? [];
      lista.push(r);
      reservasPorConta.set(r.account_id, lista);
    }
    for (const lista of reservasPorConta.values()) {
      lista.sort((a, b) => chaveDeOrdenacao(a.periodo).localeCompare(chaveDeOrdenacao(b.periodo)));
    }
  }

  const totalDeReservas = Array.from(reservasPorConta.values()).reduce((soma, lista) => soma + lista.length, 0);
  const totalDePessoas = Array.from(reservasPorConta.values())
    .flat()
    .reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:max-w-5xl md:px-10 lg:max-w-6xl lg:px-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reservas — todas as contas</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Visão geral só de leitura. Pra confirmar presença, editar ou excluir uma reserva, use o
            painel da conta (/reservas).
          </p>
        </div>
        <Link
          href="/contas"
          className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/[0.08]"
        >
          Voltar
        </Link>
      </div>

      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-neutral-400">Dia</label>
          <input
            type="date"
            name="data"
            defaultValue={dataSelecionada}
            className="mt-1.5 rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition hover:border-indigo-400/50 hover:bg-indigo-500/20"
        >
          Ver esse dia
        </button>
        <div className="flex gap-2">
          <Link
            href={`/contas/reservas?data=${somarDiasISO(dataSelecionada, -1)}`}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-300 transition hover:bg-white/[0.08]"
          >
            ← Dia anterior
          </Link>
          <Link
            href={`/contas/reservas?data=${somarDiasISO(dataSelecionada, 1)}`}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-300 transition hover:bg-white/[0.08]"
          >
            Dia seguinte →
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-neutral-400">
        <span className="font-semibold text-neutral-200">{formatarDataParaRotulo(dataSelecionada, hojeISO)}</span> —{" "}
        {totalDeReservas} reserva(s), {totalDePessoas} pessoa(s) no total, em {contasComReserva.length} conta(s) com
        Reserva ativa.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {contasComReserva.length === 0 && (
          <div className={CLASSE_SECAO}>
            <p className="text-sm text-neutral-400">Nenhuma conta com Reserva ativada ainda.</p>
          </div>
        )}

        {contasComReserva.map((conta) => {
          const reservas = reservasPorConta.get(conta.id) ?? [];
          return (
            <div key={conta.id} className={CLASSE_SECAO}>
              <div className="flex items-center justify-between gap-3">
                <p className={CLASSE_TITULO_SECAO}>{conta.page_name}</p>
                <Link
                  href={`/contas/${conta.id}/reserva`}
                  className="text-xs text-indigo-300 underline-offset-2 hover:underline"
                >
                  Configurar
                </Link>
              </div>

              {reservas.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">Nenhuma reserva pra esse dia.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {reservas.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3.5 py-2.5 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-neutral-300">
                          {rotuloDoPeriodo(r.periodo)}
                        </span>
                        <span className="font-medium text-neutral-100">
                          {r.cliente_nome || r.cliente_instagram_username || "Sem nome"}
                        </span>
                        <span className="text-neutral-400">{r.quantidade_pessoas ?? "—"} pessoa(s)</span>
                      </div>
                      <span className="text-neutral-500">{r.whatsapp ?? "sem WhatsApp"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
