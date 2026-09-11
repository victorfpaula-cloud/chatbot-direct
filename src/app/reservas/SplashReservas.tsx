"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Tela de abertura animada — só aparece quando o app foi aberto pela tela de início do celular
 * (modo instalado/standalone). Quem visita a URL num navegador normal nunca vê isso.
 * `useLayoutEffect` decide isso ANTES da primeira pintura da tela, pra ninguém no navegador
 * normal chegar a ver um flash da splash por trás.
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
        // Tamanho contido (não mais tela cheia) — nem gigante nem minúsculo — e sem cortar nada
        // (object-contain). O vídeo em si tem um brilho que vai até a borda do quadro (nunca é um
        // preto liso), então nenhuma cor de fundo bate perfeitamente com ele — em vez de tentar
        // acertar a cor, a máscara abaixo esmaece as bordas do vídeo até ficarem transparentes,
        // fundindo com o fundo escuro por trás sem nenhuma linha de corte visível.
        className="aspect-[480/854] w-56 object-contain sm:w-64"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse closest-side at center, black 80%, transparent 105%)",
          maskImage: "radial-gradient(ellipse closest-side at center, black 80%, transparent 105%)",
        }}
      />
    </div>
  );
}
