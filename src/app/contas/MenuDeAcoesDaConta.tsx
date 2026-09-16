"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menu "⋯" com as ações menos usadas do dia a dia (Administração de reservas, Pausar/Reativar,
 * Excluir) — antes cada uma era um botão sempre visível no cartão, o que deixava cartões com
 * reserva habilitada mais altos que os outros (o botão "Administração de reservas" só aparecia
 * pra quem tinha esse produto). Juntando as três num menu, todo cartão fica com a mesma altura
 * de rodapé, tenha reserva ou não — só "Configurações gerais" continua sempre visível como botão,
 * ao lado desse menu.
 */
export function MenuDeAcoesDaConta({
  contaId,
  ativo,
  reservaHabilitada,
}: {
  contaId: string;
  ativo: boolean;
  reservaHabilitada: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (ref.current && !ref.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Mais ações dessa conta"
        aria-expanded={aberto}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition hover:border-white/25 hover:text-neutral-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute bottom-full right-0 z-10 mb-1.5 w-56 rounded-xl border border-white/15 bg-neutral-950 p-1.5 shadow-xl shadow-black/40">
          {reservaHabilitada ? (
            <a
              href={`/reservas?conta=${contaId}`}
              className="block rounded-lg px-3 py-2 text-left text-sm font-medium text-violet-200 hover:bg-white/5"
            >
              Administração de reservas
            </a>
          ) : (
            <span className="block cursor-not-allowed rounded-lg px-3 py-2 text-left text-sm text-neutral-600">
              Administração de reservas
            </span>
          )}

          <div className="my-1 h-px bg-white/10" />

          <form action="/api/contas/status" method="POST">
            <input type="hidden" name="account_id" value={contaId} />
            <input type="hidden" name="ativar" value={ativo ? "0" : "1"} />
            <button
              type="submit"
              onClick={(evento) => {
                if (ativo) {
                  const confirmou = window.confirm(
                    "Tem certeza que deseja pausar essa conta? O bot vai parar de responder no Direct até você reativar."
                  );
                  if (!confirmou) evento.preventDefault();
                }
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-white/5"
            >
              {ativo ? "Pausar conta" : "Reativar conta"}
            </button>
          </form>

          <a
            href={`/contas/${contaId}/excluir`}
            className="block rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-950/40"
          >
            Excluir conta
          </a>
        </div>
      )}
    </div>
  );
}
