"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// A tela /contas é force-dynamic mas SÓ recalcula os números (Atendimentos hoje, Stories hoje
// etc.) quando a página carrega de novo — sem esse botão, quem deixa a aba aberta fica vendo
// número velho até fechar/reabrir ou trocar de tela e voltar. `router.refresh()` re-executa o
// Server Component com dado fresco, sem precisar de reload de navegador (não perde scroll nem
// pisca a tela inteira em branco).
export function BotaoAtualizar() {
  const router = useRouter();
  const [atualizando, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciarTransicao(() => router.refresh())}
      disabled={atualizando}
      aria-label="Atualizar números"
      title="Atualizar números"
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 ${atualizando ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
