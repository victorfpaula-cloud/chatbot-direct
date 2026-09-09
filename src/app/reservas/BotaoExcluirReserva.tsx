"use client";

export function BotaoExcluirReserva({
  action,
  redirectTo,
  nomeCliente,
}: {
  action: string;
  redirectTo: string;
  nomeCliente: string;
}) {
  return (
    <form
      action={action}
      method="POST"
      className="contents"
      onSubmit={(evento) => {
        const confirmou = window.confirm(
          `Tem certeza que quer excluir a reserva de ${nomeCliente}? Essa ação não pode ser desfeita.`
        );
        if (!confirmou) evento.preventDefault();
      }}
    >
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:bg-red-950/40 hover:text-red-400"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
        </svg>
        Excluir
      </button>
    </form>
  );
}
