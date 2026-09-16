import { criarClienteAdmin } from "@/lib/supabase/admin";
import { montarRelatorio } from "@/lib/relatorioSemanal";
import { ultimosDiasEmSaoPauloISO } from "@/lib/datas";
import { CartaoDeSecao } from "../CartaoDeSecao";
import {
  CLASSE_CAMPO,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
  CLASSE_CHECKBOX,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";

const PERIODOS = [7, 15, 30] as const;

function formatarHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map((v) => parseInt(v, 10));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(
    new Date(Date.UTC(ano, mes - 1, dia, 12))
  );
}

function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto > 0 ? `${minutos}min ${resto}s` : `${minutos}min`;
}

export default async function RelatoriosPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string; enviado?: string; dias?: string };
}) {
  const admin = criarClienteAdmin();
  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select("relatorio_email, relatorio_habilitado, relatorio_ultimo_envio_em")
    .eq("account_id", params.id)
    .maybeSingle();

  const diasBruto = parseInt(searchParams.dias ?? "30", 10);
  const dias = (PERIODOS as readonly number[]).includes(diasBruto) ? diasBruto : 30;

  const relatorio = await montarRelatorio(admin, params.id, ultimosDiasEmSaoPauloISO(dias));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Relatórios</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Atendimentos, mensagens{relatorio.reservaHabilitada ? ", reservas" : ""}
            {relatorio.storiesHabilitado ? " e Stories publicados" : ""} — cadastre um e-mail pra
            receber automaticamente toda segunda-feira, ou mande na hora pelo botão abaixo.
          </p>
        </div>

        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {PERIODOS.map((p) => (
            <a
              key={p}
              href={`/contas/${params.id}/relatorios?dias=${p}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                p === dias ? "bg-indigo-500 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {p} dias
            </a>
          ))}
        </div>
      </div>

      {searchParams.salvo && <div className={CLASSE_AVISO_SALVO}>Configuração salva.</div>}
      {searchParams.enviado && <div className={CLASSE_AVISO_SALVO}>Relatório enviado.</div>}
      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <CartaoDeSecao titulo="Envio por e-mail">
        <form action="/api/contas/relatorio-config" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="account_id" value={params.id} />

          <div>
            <label className={CLASSE_RÓTULO}>E-mail de destino</label>
            <input
              type="email"
              name="relatorio_email"
              placeholder="cliente@exemplo.com"
              defaultValue={config?.relatorio_email ?? ""}
              className={CLASSE_CAMPO}
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="relatorio_habilitado"
              value="1"
              defaultChecked={config?.relatorio_habilitado ?? false}
              className={CLASSE_CHECKBOX}
            />
            Enviar automaticamente toda segunda-feira de manhã (últimos 7 dias)
          </label>

          {config?.relatorio_ultimo_envio_em && (
            <p className={CLASSE_AJUDA}>Último envio: {formatarDataHora(config.relatorio_ultimo_envio_em)}</p>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" className={CLASSE_BOTAO_SALVAR}>
              Salvar
            </button>
          </div>
        </form>

        <form action="/api/contas/relatorio-enviar" method="POST" className="mt-1">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="dias" value={dias} />
          <button
            type="submit"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white/25 hover:bg-white/10"
          >
            Enviar agora (últimos {dias} dias — {formatarDataCurta(relatorio.inicioISO)} a{" "}
            {formatarDataCurta(relatorio.fimISO)})
          </button>
        </form>
      </CartaoDeSecao>

      <CartaoDeSecao
        titulo="Prévia do relatório"
        descricao={`Últimos ${dias} dias — ${formatarDataCurta(relatorio.inicioISO)} a ${formatarDataCurta(relatorio.fimISO)} — mesmos dados que vão no e-mail.`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Atendimentos</p>
            <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.totalAtendimentos}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Mensagens</p>
            <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.totalMensagens}</p>
          </div>
          {relatorio.reservaHabilitada && (
            <div className="rounded-xl border border-white/10 bg-emerald-500/[0.06] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Reservas</p>
              <div className="mt-1 flex items-baseline gap-4">
                <div>
                  <p className="text-2xl font-bold text-neutral-50">{relatorio.totalReservas}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">reservas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-50">{relatorio.totalPessoasReservas}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">pessoas</p>
                </div>
              </div>
            </div>
          )}
          {relatorio.storiesHabilitado && relatorio.storiesConectado && (
            <div className="rounded-xl border border-white/10 bg-amber-500/[0.06] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Stories publicados
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.totalStoriesPublicados}</p>
              {(relatorio.totalStoriesComErro ?? 0) > 0 && (
                <p className="mt-0.5 text-xs font-medium text-red-400">
                  {relatorio.totalStoriesComErro} com erro
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Média por dia</p>
            <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.mediaMensagensPorDia}</p>
            <p className="mt-0.5 text-xs text-neutral-500">mensagens/dia</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Dia mais movimentado</p>
            {relatorio.diaComMaisMensagens ? (
              <>
                <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.diaComMaisMensagens.total}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  mensagens em {formatarDataCurta(relatorio.diaComMaisMensagens.dataISO)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">Sem mensagens no período.</p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Tempo médio de resposta</p>
            {relatorio.tempoMedioDeRespostaSegundos !== null ? (
              <p className="mt-1 text-2xl font-bold text-neutral-50">
                {formatarDuracao(relatorio.tempoMedioDeRespostaSegundos)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">Ainda sem dados.</p>
            )}
          </div>
          <div
            className={`rounded-xl border border-white/10 px-4 py-3 ${
              relatorio.totalComErro > 0 ? "bg-red-500/[0.06]" : "bg-white/[0.03]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Atendimentos com erro</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                relatorio.totalComErro > 0 ? "text-red-400" : "text-neutral-50"
              }`}
            >
              {relatorio.totalComErro}
            </p>
          </div>
        </div>
      </CartaoDeSecao>

      <CartaoDeSecao
        titulo="Atendimentos detalhados"
        descricao={`${relatorio.totalAtendimentos} clientes · ${relatorio.totalMensagens} mensagens no total — horário da primeira mensagem de cada cliente e da nossa resposta.`}
      >
        {relatorio.atendimentos.length === 0 ? (
          <p className={CLASSE_AJUDA}>Nenhum atendimento nesse período.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-neutral-950/95 text-[11px] uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Dia</th>
                  <th className="px-3 py-2 font-semibold">Mensagem</th>
                  <th className="px-3 py-2 font-semibold">Resposta</th>
                  <th className="px-3 py-2 text-right font-semibold">Mensagens</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.atendimentos.map((a, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-2 text-neutral-200">
                      {a.clienteNome ?? "Cliente"}
                      {a.clienteUsername ? <span className="text-neutral-500"> · @{a.clienteUsername}</span> : null}
                      {a.teveErro && (
                        <span className="ml-2 rounded-full border border-red-900 bg-red-950 px-1.5 py-0.5 text-[10px] text-red-300">
                          erro
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-400">{formatarDataCurta(a.diaISO)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-400">
                      {a.horarioMensagem ? formatarHora(a.horarioMensagem) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-400">{formatarHora(a.horarioResposta)}</td>
                    <td className="px-3 py-2 text-right text-neutral-300">{a.totalMensagens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CartaoDeSecao>

      {relatorio.storiesHabilitado && relatorio.storiesConectado && (
        <CartaoDeSecao
          titulo="Stories publicados por dia"
          descricao={`${relatorio.totalStoriesPublicados} publicados${(relatorio.totalStoriesComErro ?? 0) > 0 ? `, ${relatorio.totalStoriesComErro} com erro` : ""}.`}
        >
          {!relatorio.storiesPorDia || relatorio.storiesPorDia.length === 0 ? (
            <p className={CLASSE_AJUDA}>Nenhum Story publicado nesse período.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {relatorio.storiesPorDia.map((s) => (
                <div
                  key={s.dataISO}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <span className="text-neutral-300">{formatarDataCurta(s.dataISO)}</span>
                  <span className="font-semibold text-neutral-100">{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </CartaoDeSecao>
      )}
    </div>
  );
}
