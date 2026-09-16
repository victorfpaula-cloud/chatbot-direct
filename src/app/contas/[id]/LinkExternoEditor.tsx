"use client";

import { useState } from "react";

// Mesmo domínio custom de src/middleware.ts (DOMINIOS_DA_RESERVA_EXTERNA) — automesa.com.br/algo
// é reescrito por trás pra /r/algo. Só texto aqui; se o domínio mudar um dia, atualizar os dois
// lugares.
const DOMINIO = "automesa.com.br";

/** Campo de slug + link pronto pra copiar, reaproveitado nas abas de Reserva e Agendamento (as
 * duas editam o MESMO chatbot_accounts.slug — uma conta só, um link só, editável de qualquer uma
 * das duas telas). Só o campo de texto (`slug`) é enviado no submit do formulário que envolve
 * isso; a normalização (minúsculo, sem acento/espaço) acontece no servidor, ao salvar. */
export default function LinkExternoEditor({ valorInicial }: { valorInicial: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const linkAtual = valorInicial ? `https://${DOMINIO}/${valorInicial}` : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-black/25 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30">
        <span className="flex shrink-0 items-center pl-3.5 pr-1 text-sm text-neutral-500">{DOMINIO}/</span>
        <input
          type="text"
          name="slug"
          defaultValue={valorInicial ?? ""}
          placeholder="unico"
          className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />
      </div>

      {linkAtual ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-3.5 py-2.5">
          <a
            href={linkAtual}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-emerald-300 underline underline-offset-2"
          >
            {linkAtual}
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(linkAtual);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              } catch {
                // Clipboard pode falhar (permissão negada, contexto não seguro) — sem crash, só
                // não mostra o "Copiado!"; a pessoa ainda copia à mão pelo texto do link ao lado.
              }
            }}
            className="shrink-0 rounded-lg border border-emerald-700/50 bg-emerald-900/40 px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-900/70"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          Preenche o campo acima e salva a configuração pra gerar o link — depois ele aparece aqui
          pra copiar.
        </p>
      )}
    </div>
  );
}
