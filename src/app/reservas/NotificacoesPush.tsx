"use client";

import { useEffect, useState } from "react";

type Estado = "verificando" | "indisponivel" | "negado" | "disponivel" | "ativando" | "ativado";

// A applicationServerKey do pushManager.subscribe precisa ser um Uint8Array, não a string base64
// que veio do servidor — conversão padrão pra esse formato (base64 URL-safe).
function chavePublicaParaUint8Array(base64: string): Uint8Array {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Normal = (base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64Normal);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

/**
 * Botão "Ativar notificações" da tela de reservas — só aparece pra quem já adicionou a tela à
 * tela de início (é a única forma do iPhone permitir push nesse tipo de app) e ainda não ativou.
 * Depois de ativado, atualiza o numerozinho do ícone toda vez que o app é aberto (além do que a
 * notificação em si já atualiza sozinha, em tempo real, via public/sw.js).
 */
export function NotificacoesPush({ contaId }: { contaId: string | null }) {
  const [estado, setEstado] = useState<Estado>("verificando");

  useEffect(() => {
    async function iniciar() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setEstado("indisponivel");
        return;
      }

      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js");
      const inscricaoAtual = await registro.pushManager.getSubscription();
      setEstado(inscricaoAtual ? "ativado" : "disponivel");

      // Além da notificação em si já atualizar o ícone na hora, atualiza de novo sempre que o app
      // é aberto — cobre o aparelho ter ficado fechado o dia inteiro ou perdido alguma notificação.
      if ("setAppBadge" in navigator && contaId) {
        try {
          const params = new URLSearchParams({ conta: contaId });
          const resposta = await fetch(`/api/reservas/push/contagem-hoje?${params.toString()}`);
          const dados = await resposta.json();
          if (typeof dados.total === "number") {
            (navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(dados.total);
          }
        } catch {
          // Falha aqui não é grave — o ícone só fica um pouco desatualizado até a próxima abertura.
        }
      }
    }

    iniciar();
  }, [contaId]);

  async function ativar() {
    setEstado("ativando");

    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      setEstado("negado");
      return;
    }

    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chavePublica) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");
      setEstado("disponivel");
      return;
    }

    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chavePublicaParaUint8Array(chavePublica) as BufferSource,
      });

      await fetch("/api/reservas/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, subscription: inscricao.toJSON() }),
      });

      setEstado("ativado");
    } catch (erro) {
      console.error("Falha ao ativar notificações:", erro);
      setEstado("disponivel");
    }
  }

  if (estado === "verificando" || estado === "indisponivel" || estado === "ativado") {
    return null;
  }

  if (estado === "negado") {
    return (
      <span className="text-xs text-neutral-600" title="Ative nas configurações do navegador/do celular">
        Notificações bloqueadas
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={ativar}
      disabled={estado === "ativando"}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        <path d="M18.63 13V9A6.67 6.67 0 0 0 15 3.2" />
        <path d="M6.26 6.26A6.67 6.67 0 0 0 5.37 9v4c0 1.6-.75 2.63-1.5 3.3-.65.6-1 1.4-1 2.2h9.63" />
      </svg>
      {estado === "ativando" ? "Ativando…" : "Ativar notificações"}
    </button>
  );
}
