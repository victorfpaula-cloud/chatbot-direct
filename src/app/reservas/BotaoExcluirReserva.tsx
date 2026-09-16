"use client";

export function BotaoExcluirReserva({
  action,
  redirectTo,
  nomeCliente,
  apagado = false,
}: {
  action: string;
  redirectTo: string;
  nomeCliente: string;
  /** Reserva já confirmada (card desbotado/em vidro) — o botão vira branco pra combinar em vez de
   * ficar cinza contra um fundo que já quase some. */
  apagado?: boolean;
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
        aria-label="Excluir reserva"
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-full hover:bg-red-950/40 hover:text-red-400 ${
          apagado ? "bg-white/[0.06] text-white" : "bg-white/[0.04] text-neutral-400"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
        </svg>
      </button>
    </form>
  );
}
