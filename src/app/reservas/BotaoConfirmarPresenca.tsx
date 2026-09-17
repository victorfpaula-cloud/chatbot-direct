"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./reservasCompartilhado";

const CAMINHO_CHECK = "M20 6L9 17l-5-5";

// Mesmo "vidro" índigo do bloco de pessoas do cartão (ver reservasCompartilhado.tsx) — pedido do
// Victor pra combinar, já que fica alinhado bem embaixo dele na mesma coluna à direita do cartão.
// Cantos em 10px (não 9999px/pill) pelo mesmo motivo: o resto do cartão é todo "quadrado"
// (rounded-xl/rounded-2xl), um botão arredondado sozinho ali destoava.
const CLASSE_BOTAO_CONFIRMAR =
  "flex shrink-0 items-center gap-1 rounded-[10px] border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-2.5 py-1.5 text-[10px] font-medium text-neutral-200";
// Bem apagado de propósito (não branco/destacado) — esse selo só aparece dentro do cartão já
// confirmado, que agora é um vidro fosco escuro; um selo brilhante ali chamaria atenção de novo
// bem no lugar que devia estar sumindo.
const CLASSE_SELO_CHEGOU =
  "flex shrink-0 items-center gap-1 rounded-[10px] border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-medium text-white/25";

/**
 * Clicar aqui precisa parecer instantâneo (pedido do Victor: o cartão inteiro tem que mudar de
 * cara — vidro claro → escuro/apagado, ou vice-versa — NA HORA do toque, sem esperar o
 * atendimento/servidor). Por isso não navega mais de página nenhuma: quem muda a cara do cartão é
 * o estado otimista lá em CartaoDeReserva (`aoAlternar`, chamado ANTES de qualquer chamada de
 * rede); a gravação de verdade no banco roda por trás, via fetch — se falhar (raríssimo, sem
 * internet etc.), desfaz o estado otimista e avisa com um toast discreto embaixo da tela.
 */
export function BotaoConfirmarPresenca({
  action,
  redirectTo,
  nomeCliente,
  presencaConfirmada,
  aoAlternar,
}: {
  action: string;
  redirectTo: string;
  nomeCliente: string;
  presencaConfirmada: boolean;
  /** Muda a cara do cartão imediatamente (chamado antes do fetch terminar) — e de novo, com o
   * valor anterior, se a gravação no banco falhar. */
  aoAlternar: (novoValor: boolean) => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(false);

  function confirmarNoServidor(valorOtimista: boolean) {
    // Fire-and-forget de propósito — a UI já mudou; isso só precisa acontecer, não bloquear nada.
    // O toggle é decidido pelo próprio servidor a partir do que já está gravado (ver
    // /api/reservas/[id]/confirmar-presenca), então mandar redirect_to é só resquício de quando
    // essa ação navegava de página — a resposta (um redirect) é ignorada aqui.
    const formData = new FormData();
    formData.set("redirect_to", redirectTo);
    fetch(action, { method: "POST", body: formData })
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`status ${resposta.status}`);
      })
      .catch((erroDeRede) => {
        console.error("Falha ao confirmar presença, desfazendo na tela:", erroDeRede);
        aoAlternar(!valorOtimista);
        setErro(true);
        setTimeout(() => setErro(false), 3000);
      });
  }

  const toast =
    erro &&
    createPortal(
      <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        <div className="rounded-xl border border-red-900 bg-red-950 px-4 py-2.5 text-xs font-medium text-red-200 shadow-lg">
          Não deu pra confirmar — sem internet? Tenta de novo.
        </div>
      </div>,
      document.body
    );

  // Já chegou: clicar em "Chegou" desfaz na hora, sem popup — só o "Confirmar" inicial precisa de
  // confirmação (pra não marcar alguém como chegado sem querer); desfazer não tem esse risco.
  if (presencaConfirmada) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            aoAlternar(false);
            confirmarNoServidor(false);
          }}
          className={CLASSE_SELO_CHEGOU}
        >
          <Icone path={CAMINHO_CHECK} className="h-3 w-3" />
          Chegou
        </button>
        {toast}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setModalAberto(true)} className={CLASSE_BOTAO_CONFIRMAR}>
        <Icone path={CAMINHO_CHECK} className="h-3 w-3 text-indigo-400" />
        Confirmar
      </button>
      {toast}

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
                    aoAlternar(true);
                    confirmarNoServidor(true);
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
