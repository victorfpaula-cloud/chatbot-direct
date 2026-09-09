"use client";

import { useState } from "react";
import { Icone } from "./reservasCompartilhado";

type Estado = "fechado" | "carregando" | "carregado" | "erro";
type Dados = { historico: { data: string; total: number }[]; totalDeReservasNoAno: number; totalDePessoasNoAno: number };

const CAMINHO_RELOGIO_HISTORICO = "M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8";
const CAMINHO_SETA_BAIXO = "M6 9l6 6 6-6";

function formatarDataCurta(dataISO: string): string {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

/**
 * Bloco "Histórico e totais do ano" da tela Hoje — fechado por padrão, só busca os dados
 * (/api/reservas/historico) quando a pessoa realmente abre. É informação "bom saber", não
 * essencial pra ver as reservas do dia, então não vale a pena pagar essas duas consultas em toda
 * abertura da tela.
 */
export function HistoricoSobDemanda({
  contaId,
  hoje,
}: {
  contaId: string | null;
  hoje: string;
}) {
  const [estado, setEstado] = useState<Estado>("fechado");
  const [dados, setDados] = useState<Dados | null>(null);

  async function carregar() {
    setEstado("carregando");
    try {
      const params = new URLSearchParams();
      if (contaId) params.set("conta", contaId);
      const resposta = await fetch(`/api/reservas/historico?${params.toString()}`);
      if (!resposta.ok) {
        const corpoDoErro = await resposta.text().catch(() => "");
        console.error(`/api/reservas/historico falhou (${resposta.status}): ${corpoDoErro}`);
        throw new Error("falha na requisição");
      }
      setDados(await resposta.json());
      setEstado("carregado");
    } catch (erro) {
      console.error("Falha ao carregar histórico", erro);
      setEstado("erro");
    }
  }

  const maiorDoHistorico = Math.max(1, ...(dados?.historico.map((h) => h.total) ?? []));

  return (
    <details
      className="mt-10 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
      onToggle={(evento) => {
        const abriu = (evento.target as HTMLDetailsElement).open;
        if (abriu && (estado === "fechado" || estado === "erro")) carregar();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 [&::-webkit-details-marker]:hidden">
        <Icone path={CAMINHO_RELOGIO_HISTORICO} className="h-3.5 w-3.5" />
        Histórico e total de reservas
        <Icone path={CAMINHO_SETA_BAIXO} className="ml-auto h-4 w-4 text-neutral-600" />
      </summary>

      <div className="px-4 pb-4">
        {estado === "carregando" && <p className="py-4 text-center text-sm text-neutral-500">Carregando...</p>}
        {estado === "erro" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center text-sm text-red-400">
            <p>Não foi possível carregar o histórico.</p>
            <button
              type="button"
              onClick={carregar}
              className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:border-red-600"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {estado === "carregado" && dados && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <p className="text-xs text-neutral-500">Total de reservas até hoje</p>
                <p className="mt-1 text-xl font-semibold text-neutral-100">{dados.totalDeReservasNoAno}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <p className="text-xs text-neutral-500">Pessoas atendidas</p>
                <p className="mt-1 text-xl font-semibold text-neutral-100">{dados.totalDePessoasNoAno}</p>
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
              {dados.historico.map((dia, i) => {
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
              <span>{formatarDataCurta(dados.historico[0]?.data ?? hoje)}</span>
              <span>{formatarDataCurta(dados.historico[dados.historico.length - 1]?.data ?? hoje)}</span>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
