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
        className="rounded-md border border-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-500 hover:border-red-900 hover:text-red-400"
      >
        Excluir
      </button>
    </form>
  );
}
