"use client";

import { useRef } from "react";

export function FormularioDeEdicaoDeReserva({
  action,
  redirectTo,
  nomeCliente,
  quantidadeAtual,
}: {
  action: string;
  redirectTo: string;
  nomeCliente: string;
  quantidadeAtual: number;
}) {
  const detalhesRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detalhesRef} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 [&::-webkit-details-marker]:hidden hover:bg-neutral-900 hover:text-neutral-200">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Editar
      </summary>

      <form
        action={action}
        method="POST"
        className="absolute left-0 z-10 mt-2 flex w-56 flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-xl shadow-black/40"
        onSubmit={(evento) => {
          const confirmou = window.confirm(
            `Tem certeza que quer alterar o número de pessoas da reserva de ${nomeCliente}?`
          );
          if (!confirmou) evento.preventDefault();
        }}
      >
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label className="text-xs text-neutral-500">Novo número de pessoas</label>
        <input
          type="number"
          name="quantidade_pessoas"
          min={1}
          defaultValue={quantidadeAtual}
          required
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-950"
          >
            Salvar alteração
          </button>
          <button
            type="button"
            onClick={() => {
              // Só fecha a caixinha, sem enviar nada — pra quem abriu "Editar" sem querer poder
              // sair sem mexer em nada.
              if (detalhesRef.current) detalhesRef.current.open = false;
            }}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
          >
            Cancelar
          </button>
        </div>
      </form>
    </details>
  );
}
