"use client";

/**
 * Chavinha (toggle switch) genérica de ligar/desligar um serviço por conta — substitui
 * BotaoAtivarReservas/BotaoAtivarAgendamento (um botão de texto cada, quase idênticos) por um
 * componente só, reaproveitado tanto nos cartõezinhos de /contas quanto no cabeçalho de cada
 * aba de serviço (Reserva/Agendamento/Busca ao Vivo). Sempre um <button type="submit"> dentro
 * de um <form> já montado por quem usa esse componente — o clique dispara a navegação de
 * página inteira de sempre (POST + redirect), sem JS extra pra "otimista" atualizar o visual.
 */
export function Interruptor({
  ligado,
  rotulo,
  mensagemConfirmarDesligar,
}: {
  ligado: boolean;
  /** Texto ao lado da chavinha — omitido quando o rótulo já aparece em outro lugar (ex: o próprio
   * cartão da conta já diz "Reserva" acima da fileira de chavinhas). */
  rotulo?: string;
  /** Perguntado só ao DESLIGAR (ligar nunca tem risco/confirmação) — se omitido, desliga direto. */
  mensagemConfirmarDesligar?: string;
}) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={(evento) => {
        if (ligado && mensagemConfirmarDesligar) {
          const confirmou = window.confirm(mensagemConfirmarDesligar);
          if (!confirmou) evento.preventDefault();
        }
      }}
      className="group flex items-center gap-2.5"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          ligado ? "bg-indigo-500" : "border border-white/15 bg-white/10"
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform ${
            ligado ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </span>
      {rotulo && (
        <span className={`text-sm font-medium ${ligado ? "text-neutral-100" : "text-neutral-500"}`}>{rotulo}</span>
      )}
    </button>
  );
}
