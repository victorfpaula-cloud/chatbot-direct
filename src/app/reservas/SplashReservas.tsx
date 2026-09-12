"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Tela de abertura animada (vídeo em tela cheia) — só quando o app é REALMENTE aberto (ícone na
 * tela de início), nunca ao trocar de tela dentro dele. Essa decisão já vem pronta do servidor:
 * `reservas/layout.tsx` só manda esse componente pro HTML quando a requisição parece uma abertura
 * de verdade (sem Referer de uma página nossa) — troca de tela (clicar em Antigas/Hoje/Futuras,
 * editar uma reserva, etc.) sempre chega com Referer e nem chega a montar esse componente, caindo
 * só na barrinha simples de sempre (reservas/loading.tsx) enquanto a próxima tela carrega.
 *
 * Tentamos primeiro guardar "já mostrei" em sessionStorage, depois num cookie lido no cliente —
 * nenhum dos dois se mostrou confiável pra esse fim num app instalado (standalone) no iOS/WebKit,
 * a splash continuava reaparecendo em navegações internas. Resolvido decidindo isso no servidor
 * (Referer), sem depender de nenhuma API de armazenamento do navegador.
 *
 * O que só o CLIENTE sabe (e por isso ainda é conferido aqui dentro) é se o app está mesmo em modo
 * instalado/standalone — sem essa checagem, alguém abrindo a URL direto num navegador comum
 * também veria o vídeo. `useLayoutEffect` decide isso ANTES da primeira pintura da tela, pra
 * ninguém chegar a ver um flash da splash por trás quando não é instalado.
 */
export function SplashReservas() {
  const [modoInstalado, setModoInstalado] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [montado, setMontado] = useState(true);

  useLayoutEffect(() => {
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!instalado) {
      setModoInstalado(false);
      setMontado(false);
      // Defensivo: se o script síncrono do layout pausou a animação de entrada esperando a
      // splash, mas ela não vai aparecer (não é modo instalado), libera na hora — sem isso ela
      // ficaria parada pra sempre, sem nada pra removê-la depois.
      try {
        document.documentElement.classList.remove("cd-aguardando-splash-reservas");
      } catch {
        // Sem acesso ao documentElement — não é grave.
      }
    }
  }, []);

  useEffect(() => {
    if (!modoInstalado) return;

    // Segurança: some sozinha mesmo se o vídeo não disparar "ended" por algum motivo (ex.:
    // autoplay bloqueado nessa sessão) — a splash nunca pode travar a abertura do app.
    const tempoMaximo = setTimeout(esconder, 3500);
    return () => clearTimeout(tempoMaximo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoInstalado]);

  function esconder() {
    setSaindo(true);
    // Libera a animação de entrada dos containers por baixo (ver globals.css +
    // reservas/layout.tsx) bem na hora que a splash começa a sumir, pra ela rodar por baixo do
    // fade-out em vez de já ter acontecido escondida, sem ninguém ver.
    try {
      document.documentElement.classList.remove("cd-aguardando-splash-reservas");
    } catch {
      // Sem acesso ao documentElement por algum motivo — pior caso a animação já rodou escondida,
      // não trava nada.
    }
    setTimeout(() => setMontado(false), 400);
  }

  if (!montado) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#171717] transition-opacity"
      style={{ opacity: saindo ? 0 : 1, pointerEvents: saindo ? "none" : "auto", transitionDuration: "400ms" }}
    >
      <video
        src="/reservas-splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={esconder}
        // Tela cheia de novo (como era antes), mas com object-contain em vez de object-cover: o
        // vídeo inteiro sempre aparece por completo, sem cortar nada nas bordas (o "saindo pra
        // fora" era o corte do cover, não o tamanho). Como a proporção do vídeo é um pouco
        // diferente da tela do celular, pode sobrar uma tarjinha escura em cima/embaixo — mas
        // como é a MESMA cor do fundo, não chama atenção como o retângulo da versão pequena.
        className="h-full w-full object-contain"
      />
    </div>
  );
}
