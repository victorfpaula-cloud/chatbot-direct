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
      if (!resposta.ok) throw new Error("falha na requisição");
      const corpo = await resposta.json();

      const grupos: Record<string, Reserva[]> = {};
      for (const reserva of (corpo.reservas ?? []) as Reserva[]) {
        const chave = reserva.periodo ?? "sem_periodo";
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(reserva);
      }
      setGruposPorPeriodo(grupos);
      setEstado("carregado");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <details
      className="group"
      onToggle={(evento) => {
        const abriu = (evento.target as HTMLDetailsElement).open;
        if (abriu && estado === "fechado") carregar();
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
          <p className="rounded-xl border border-dashed border-red-900/60 px-4 py-6 text-center text-sm text-red-400">
            Não foi possível carregar as reservas desse dia. Tente abrir de novo.
          </p>
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
