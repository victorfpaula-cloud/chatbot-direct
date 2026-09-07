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
      <summary className="cursor-pointer list-none rounded-md border border-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-500 [&::-webkit-details-marker]:hidden hover:border-neutral-600 hover:text-neutral-300">
        Editar
      </summary>

      <form
        action={action}
        method="POST"
        className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-xl shadow-black/40"
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
