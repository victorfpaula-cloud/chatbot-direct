"use client";

import { useState } from "react";
import type { HorarioDoDia } from "@/lib/agendamentos";

const NOMES_DOS_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Janela de funcionamento por dia da semana — cada linha liga/desliga o dia e define o
 * início/fim; os blocos de horário (a cada X minutos, configurado ao lado) são gerados dividindo
 * essa janela. Mesmo padrão de campo escondido + JSON dos outros editores dessa tela. */
export default function HorariosSemanaEditor({
  nome,
  valorInicial,
}: {
  nome: string;
  valorInicial: HorarioDoDia[];
}) {
  const [horarios, setHorarios] = useState<HorarioDoDia[]>(valorInicial);

  function atualizar(dia: number, mudancas: Partial<HorarioDoDia>) {
    setHorarios((atual) => atual.map((h) => (h.dia === dia ? { ...h, ...mudancas } : h)));
  }

  return (
    <div>
      <input type="hidden" name={nome} value={JSON.stringify(horarios)} />

      <div className="flex flex-col gap-2">
        {horarios.map((h) => (
          <div key={h.dia} className="flex flex-wrap items-center gap-3">
            <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={h.ativo}
                onChange={(e) => atualizar(h.dia, { ativo: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
              />
              {NOMES_DOS_DIAS[h.dia]}
            </label>
            <input
              type="time"
              value={h.inicio}
              disabled={!h.ativo}
              onChange={(e) => atualizar(h.dia, { inicio: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm disabled:opacity-30"
            />
            <span className="text-xs text-neutral-500">até</span>
            <input
              type="time"
              value={h.fim}
              disabled={!h.ativo}
              onChange={(e) => atualizar(h.dia, { fim: e.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm disabled:opacity-30"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
