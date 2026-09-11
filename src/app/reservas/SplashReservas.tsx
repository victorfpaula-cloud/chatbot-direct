"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Guardado na aba (sessionStorage): dura enquanto a aba/o app ficar aberto, some sozinho se
// fechar e abrir de novo — mesmo padrão já usado na splash "CD" do painel administrativo
// (ver src/app/layout.tsx).
const CHAVE_JA_MOSTRADA = "reservas_splash_ja_mostrada";

/**
 * Tela de abertura animada — só aparece UMA VEZ, na primeira vez que o app é aberto (modo
 * instalado/standalone) naquela sessão. Sem esse controle, ela tocava de novo em toda navegação
 * que remonta o layout (trocar de tela, editar/excluir reserva, etc.) — virou uma animação toda
 * hora, exatamente o que não devia. Quem visita a URL num navegador normal nunca vê isso.
 * `useLayoutEffect` decide tudo isso ANTES da primeira pintura da tela, pra ninguém chegar a ver
 * um flash da splash por trás.
 */
export function SplashReservas() {
  const [modoInstalado, setModoInstalado] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [montado, setMontado] = useState(true);

  useLayoutEffect(() => {
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    let jaMostrada = false;
    try {
      jaMostrada = sessionStorage.getItem(CHAVE_JA_MOSTRADA) === "1";
    } catch {
      // Sem acesso ao sessionStorage (aba anônima restrita, etc.) — melhor não travar a splash
      // repetindo à toa, então trata como "já mostrada" e simplesmente não exibe.
      jaMostrada = true;
    }

    if (!instalado || jaMostrada) {
      setModoInstalado(false);
      setMontado(false);
      return;
    }

    try {
      sessionStorage.setItem(CHAVE_JA_MOSTRADA, "1");
    } catch {
      // Ignora — pior caso é ela aparecer de novo numa próxima navegação, não é grave.
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
