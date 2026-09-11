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
        className="h-full w-full object-cover"
      />
    </div>
  );
}
