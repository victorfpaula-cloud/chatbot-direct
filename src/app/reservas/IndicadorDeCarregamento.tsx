"use client";

import { useEffect, useState } from "react";

/**
 * Barrinha fina que aparece na hora do clique num link (Antigas/Hoje/Futuras, Voltar, etc.), antes
 * mesmo do navegador terminar de trocar de página — sem ela, o tempo entre o toque e o servidor
 * começar a responder fica sem NENHUM feedback visual (a barrinha do Next.js, em loading.tsx, só
 * aparece depois que a resposta já começou a chegar). Como aqui cada tela é uma navegação de
 * página inteira de verdade, essa troca de documento por si só já esconde essa barra quando a
 * página nova termina de carregar — não precisa de lógica pra escondê-la de novo.
 */
export function IndicadorDeCarregamento() {
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      // Clique com botão do meio/direito, ou com alguma tecla modificadora (abrir em nova aba,
      // etc.) — o navegador não troca de página aqui, então não mostra nada.
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
        return;
      }

      const alvo = evento.target as HTMLElement | null;
      const link = alvo?.closest("a");
      if (!link) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      try {
        const destino = new URL(link.href, window.location.href);
        if (destino.origin !== window.location.origin) return;
        // Mesma URL de onde já está (só uma âncora dentro da mesma página, por exemplo) — não
        // navega de verdade, não precisa de barrinha nenhuma.
        if (destino.pathname === window.location.pathname && destino.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }

      setCarregando(true);
    }

    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);

  if (!carregando) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-transparent">
      <div className="h-full w-1/3 animate-cd-barra rounded-full bg-indigo-400" />
    </div>
  );
}
