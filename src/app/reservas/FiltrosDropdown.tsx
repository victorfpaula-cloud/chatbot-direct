"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icone, CAMINHO_FUNIL } from "./reservasCompartilhado";

/**
 * Botão de Filtros + o painel que abre dele. Era um `<details>` comum, com o painel posicionado
 * `absolute` dentro dele — mas o cabeçalho onde ele mora tinha (por causa da animação de entrada)
 * um jeito de virar seu próprio "grupo de camadas" da tela, e isso prendia o painel atrás da
 * barra de abas/cards que vêm depois no HTML, não importava o z-index que a gente desse a ele
 * (corrigimos a animação uma vez, mas o WebKit do iPhone continua tratando isso como camada
 * separada de qualquer jeito). A solução definitiva: o painel é renderizado num portal, direto
 * como filho de `<body>` — fora da árvore do cabeçalho por completo, então não tem mais como
 * ficar preso atrás de nada.
 */
export function FiltrosDropdown({
  filtroPersonalizadoAtivo,
  children,
}: {
  filtroPersonalizadoAtivo: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    function aoTeclarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclarEscape);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclarEscape);
    };
  }, [aberto]);

  function alternar() {
    if (!aberto && botaoRef.current) {
      const retangulo = botaoRef.current.getBoundingClientRect();
      setPosicao({ top: retangulo.bottom + 8, right: Math.max(12, window.innerWidth - retangulo.right) });
    }
    setAberto((valor) => !valor);
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        title="Filtros"
        onClick={alternar}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl hover:border-white/20 hover:text-neutral-100"
      >
        <Icone path={CAMINHO_FUNIL} className="h-3.5 w-3.5" />
        {filtroPersonalizadoAtivo && (
          <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        )}
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={painelRef}
            className="fixed z-[200] w-72 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 shadow-xl shadow-black/40"
            style={{ top: posicao.top, right: posicao.right }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
