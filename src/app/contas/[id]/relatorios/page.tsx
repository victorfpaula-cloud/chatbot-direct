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

// Gráfico de barras simples (mensagens por dia) — SVG puro, sem lib nenhuma. Eixo com grade leve +
// valor em cima de cada barra (só quando > 0, pra não poluir dia sem mensagem).
function GraficoDeMensagens({ pontos }: { pontos: { dataISO: string; rotulo: string; total: number }[] }) {
  const largura = 600;
  const altura = 170;
  const margemEsquerda = 12;
  const margemDireita = 12;
  const margemBaixo = 24;
  const margemCima = 20;
  const areaLargura = largura - margemEsquerda - margemDireita;
  const areaAltura = altura - margemBaixo - margemCima;
  const maximo = Math.max(1, ...pontos.map((p) => p.total));
  const larguraBarra = areaLargura / pontos.length;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" role="img" aria-label="Mensagens por dia">
      {[0, 0.5, 1].map((f) => {
        const y = margemCima + areaAltura * (1 - f);
        return (
          <line
            key={f}
            x1={margemEsquerda}
            x2={largura - margemDireita}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}
      {pontos.map((p, i) => {
        const alturaBarra = (p.total / maximo) * areaAltura;
        const x = margemEsquerda + i * larguraBarra + larguraBarra * 0.22;
        const larguraReal = larguraBarra * 0.56;
        const y = margemCima + areaAltura - alturaBarra;
        return (
          <g key={p.dataISO}>
            <rect
              x={x}
              y={p.total > 0 ? y : margemCima + areaAltura - 2}
              width={larguraReal}
              height={p.total > 0 ? alturaBarra : 2}
              rx={2}
              fill="#6366f1"
            />
            {p.total > 0 && pontos.length <= 14 && (
              <text x={x + larguraReal / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#e4e4e7">
                {p.total}
              </text>
            )}
            {pontos.length <= 14 && (
              <text
                x={x + larguraReal / 2}
                y={margemCima + areaAltura + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#71717a"
              >
                {p.rotulo}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

type PontoMensagem = { dataISO: string; rotulo: string; total: number };

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
  const pontosDoGrafico: PontoMensagem[] = relatorio.mensagensPorDia;

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
              <p className="mt-1 text-2xl font-bold text-neutral-50">{relatorio.totalReservas}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{relatorio.totalPessoasReservas} pessoas</p>
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

        <div className="mt-2">
          <p className={CLASSE_AJUDA}>Mensagens por dia</p>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <GraficoDeMensagens pontos={pontosDoGrafico} />
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
