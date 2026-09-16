"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./reservasCompartilhado";

const CAMINHO_CHECK = "M20 6L9 17l-5-5";

// Mesmo "vidro" índigo do bloco de pessoas do cartão (ver reservasCompartilhado.tsx) — pedido do
// Victor pra combinar, já que fica alinhado bem embaixo dele na mesma coluna à direita do cartão.
// Cantos em 10px (não 9999px/pill) pelo mesmo motivo: o resto do cartão é todo "quadrado"
// (rounded-xl/rounded-2xl), um botão arredondado sozinho ali destoava.
const CLASSE_BOTAO_CONFIRMAR =
  "flex shrink-0 items-center gap-1 rounded-[10px] border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-2.5 py-1.5 text-[10px] font-medium text-neutral-200";
const CLASSE_SELO_CHEGOU =
  "flex shrink-0 items-center gap-1 rounded-[10px] border border-white/20 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-white";

export function BotaoConfirmarPresenca({
  action,
  redirectTo,
  nomeCliente,
  presencaConfirmada,
}: {
  action: string;
  redirectTo: string;
  nomeCliente: string;
  presencaConfirmada: boolean;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Já chegou: clicar em "Chegou" desfaz na hora, sem popup — só o "Confirmar" inicial precisa de
  // confirmação (pra não marcar alguém como chegado sem querer); desfazer não tem esse risco.
  if (presencaConfirmada) {
    return (
      <form ref={formRef} action={action} method="POST" className="contents">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <button type="submit" className={CLASSE_SELO_CHEGOU}>
          <Icone path={CAMINHO_CHECK} className="h-3 w-3" />
          Chegou
        </button>
      </form>
    );
  }

  return (
    <>
      <form ref={formRef} action={action} method="POST" className="contents">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <button type="button" onClick={() => setModalAberto(true)} className={CLASSE_BOTAO_CONFIRMAR}>
          <Icone path={CAMINHO_CHECK} className="h-3 w-3 text-indigo-400" />
          Confirmar
        </button>
      </form>

      {modalAberto &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={() => setModalAberto(false)}
          >
            <div
              className="w-full max-w-sm rounded-t-3xl border-t border-white/10 bg-[#0c0c10] px-6 pb-8 pt-6 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] sm:rounded-3xl sm:border"
              onClick={(evento) => evento.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-400">
                <Icone path={CAMINHO_CHECK} className="h-5 w-5" />
              </div>
              <p className="mt-4 text-center text-[15px] text-neutral-300">
                Confirmar chegada de
                <br />
                <span className="font-bold text-white">{nomeCliente}</span>?
              </p>
              <p className="mt-1.5 text-center text-xs text-neutral-500">
                O cartão dela vai ficar marcado como já chegou.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false);
                    formRef.current?.requestSubmit();
                  }}
                  className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-neutral-950"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
