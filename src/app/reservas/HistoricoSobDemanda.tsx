"use client";

import { useState } from "react";
import { Icone } from "./reservasCompartilhado";

type Estado = "fechado" | "carregando" | "carregado" | "erro";
type Dados = { totalDeReservasNoAno: number; totalDePessoasNoAno: number };

const CAMINHO_RELOGIO_HISTORICO = "M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8";
const CAMINHO_SETA_BAIXO = "M6 9l6 6 6-6";

/**
 * Bloco "Histórico e total de reservas" da tela Hoje — fechado por padrão, só busca os dados
 * (/api/reservas/historico) quando a pessoa realmente abre. É um contador simples (soma
 * incremental mantida em src/lib/reservas.ts, não uma consulta pesada), então abrir não pesa.
 */
export function HistoricoSobDemanda({ contaId }: { contaId: string | null }) {
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
        )}
      </div>
    </details>
  );
}
