"use client";

import { useState, type ReactNode } from "react";
import { CartaoDePeriodo, type Reserva } from "./reservasCompartilhado";

type Estado = "fechado" | "carregando" | "carregado" | "erro";

/**
 * Um dia inteiro das telas Antigas/Futuras: o cabeçalho (contagem de reservas) já vem pronto do
 * servidor, mas a lista de reservas em si só é buscada em `/api/reservas/dia` na hora em que a
 * pessoa abre esse dropdown — evita carregar os últimos 30 dias (ou todas as reservas futuras, sem
 * limite) de uma vez só toda vez que a tela abre.
 */
export function DiaComCarregamentoSobDemanda({
  cabecalho,
  data,
  contaId,
  periodo,
  busca,
  limiteMaximo,
  hrefAtualizar,
}: {
  cabecalho: ReactNode;
  data: string;
  contaId: string | null;
  periodo: string;
  busca: string;
  limiteMaximo: number | null;
  hrefAtualizar: string;
}) {
  const [estado, setEstado] = useState<Estado>("fechado");
  const [gruposPorPeriodo, setGruposPorPeriodo] = useState<Record<string, Reserva[]>>({});

  async function carregar() {
    setEstado("carregando");
    try {
      const params = new URLSearchParams({ data });
      if (contaId) params.set("conta", contaId);
      if (periodo !== "todos") params.set("periodo", periodo);
      if (busca) params.set("busca", busca);

      const resposta = await fetch(`/api/reservas/dia?${params.toString()}`);
      if (!resposta.ok) {
        // Loga o motivo real (status + corpo do erro) — sem isso, um 401/400/500 do lado do
        // servidor e uma falha de rede do celular ficam indistinguíveis na tela.
        const corpoDoErro = await resposta.text().catch(() => "");
        console.error(`/api/reservas/dia falhou (${resposta.status}): ${corpoDoErro}`);
        throw new Error("falha na requisição");
      }
      const corpo = await resposta.json();

      const grupos: Record<string, Reserva[]> = {};
      for (const reserva of (corpo.reservas ?? []) as Reserva[]) {
        const chave = reserva.periodo ?? "sem_periodo";
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(reserva);
      }
      setGruposPorPeriodo(grupos);
      setEstado("carregado");
    } catch (erro) {
      console.error("Falha ao carregar reservas do dia", erro);
      setEstado("erro");
    }
  }

  return (
    <details
      className="group"
      onToggle={(evento) => {
        const abriu = (evento.target as HTMLDetailsElement).open;
        // "erro" também dispara uma nova tentativa — sem isso, fechar e reabrir o dropdown depois
        // de uma falha nunca tentava de novo (o estado ficava travado em "erro" pra sempre), apesar
        // da própria mensagem de erro dizer pra "tentar abrir de novo".
        if (abriu && (estado === "fechado" || estado === "erro")) carregar();
      }}
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden">{cabecalho}</summary>

      <div className="mt-3 flex flex-col gap-4">
        {estado === "carregando" && (
          <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-6 text-center text-sm text-neutral-500">
            Carregando reservas...
          </p>
        )}
        {estado === "erro" && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-900/60 px-4 py-6 text-center text-sm text-red-400">
            <p>Não foi possível carregar as reservas desse dia.</p>
            <button
              type="button"
              onClick={carregar}
              className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:border-red-600"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {estado === "carregado" &&
          Object.keys(gruposPorPeriodo)
            .sort()
            .map((chavePeriodo) => (
              <CartaoDePeriodo
                key={chavePeriodo}
                periodo={chavePeriodo}
                reservas={gruposPorPeriodo[chavePeriodo]}
                limiteMaximo={limiteMaximo}
                hrefAtualizar={hrefAtualizar}
              />
            ))}
      </div>
    </details>
  );
}
