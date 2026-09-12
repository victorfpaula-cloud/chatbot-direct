"use client";

import { useEffect, useState } from "react";

// 30 dias — não precisa ser curto feito o "já mostrei a splash" (aquilo é por abertura de app);
// aqui é só "deixa de me perguntar por um tempo", pra não voltar toda hora enchendo o saco de
// quem já decidiu não instalar (ou vai instalar depois, com calma).
const DIAS_ATE_PERGUNTAR_DE_NOVO = 30;
const NOME_DO_COOKIE_DISPENSADO = "reservas_banner_instalar_dispensado";

const CAMINHO_COMPARTILHAR = "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13";
const CAMINHO_X = "M18 6L6 18M6 6l12 12";

/**
 * iOS não tem nenhuma API pra instalar um PWA com um clique (isso só existe no Chrome/Android,
 * via `beforeinstallprompt`) — o único caminho é a pessoa mesma tocar em Compartilhar > Adicionar
 * à Tela de Início, no Safari. Não tem como automatizar essa parte nem preencher esse passo por
 * ela; o que dá pra fazer é isso aqui: uma barrinha só pra quem ainda está no navegador comum
 * (não instalado) explicando o caminho, function pra ela não continuar entrando pelo Safari toda
 * vez sem saber que dá pra fixar na tela de início.
 */
export function BannerInstalarApp() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      const emStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (emStandalone) return;

      const ehIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      if (!ehIOS) return;

      const jaDispensou = document.cookie
        .split("; ")
        .includes(`${NOME_DO_COOKIE_DISPENSADO}=1`);
      if (jaDispensou) return;

      setMostrar(true);
    } catch {
      // Sem acesso a matchMedia/cookie por algum motivo — melhor não mostrar nada do que quebrar
      // a tela por causa de uma barrinha informativa.
    }
  }, []);

  function dispensar() {
    setMostrar(false);
    try {
      const maxAgeSegundos = DIAS_ATE_PERGUNTAR_DE_NOVO * 24 * 60 * 60;
      document.cookie = `${NOME_DO_COOKIE_DISPENSADO}=1; path=/; max-age=${maxAgeSegundos}`;
    } catch {
      // Pior caso: aparece de novo na próxima visita — não é grave.
    }
  }

  if (!mostrar) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-white/10 bg-neutral-900/95 px-4 py-3 backdrop-blur-xl"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d={CAMINHO_COMPARTILHAR} />
        </svg>
      </div>
      <p className="flex-1 text-xs leading-snug text-neutral-300">
        Instale este app: toque em{" "}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px text-neutral-100">
          <path d={CAMINHO_COMPARTILHAR} />
        </svg>{" "}
        <strong className="font-semibold text-neutral-100">Compartilhar</strong> aqui embaixo e depois em{" "}
        <strong className="font-semibold text-neutral-100">Adicionar à Tela de Início</strong>.
      </p>
      <button
        type="button"
        onClick={dispensar}
        title="Não mostrar de novo por um tempo"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-neutral-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d={CAMINHO_X} />
        </svg>
      </button>
    </div>
  );
}
