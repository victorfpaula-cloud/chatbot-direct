"use client";

import { useState } from "react";

const PARECE_EMAIL = /\S+@\S+\.\S+/;

/** Campo de e-mails de destino do relatório — zero, um ou vários. Digita e aperta Enter (ou vírgula)
 * pra transformar em uma "caixinha" removível, em vez de precisar separar por vírgula na mão. Cada
 * e-mail já confirmado vira um input oculto com o MESMO name ("relatorio_email"); o rascunho ainda
 * sendo digitado também leva esse name, então mesmo que a pessoa esqueça de apertar Enter antes de
 * salvar, o que tiver escrito ainda é enviado junto — o form nativo entrega tudo isso pro servidor
 * como uma lista (formData.getAll), que aí guarda como texto separado por vírgula (mesmo padrão já
 * usado pros WhatsApps de admin, ver WhatsAppsAdminEditor.tsx/relatorio-config/route.ts). */
export default function EmailsDeRelatorioEditor({ valorInicial }: { valorInicial: string }) {
  const iniciais = valorInicial
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const [emails, setEmails] = useState<string[]>(iniciais);
  const [rascunho, setRascunho] = useState("");

  function confirmar() {
    const valor = rascunho.trim().replace(/,+$/, "");
    // Não vira caixinha se não parece um e-mail de verdade — fica o texto ali pra pessoa corrigir,
    // em vez de aceitar qualquer coisa e só descobrir que tava errado quando o envio falhar.
    if (!valor || !PARECE_EMAIL.test(valor)) return;
    setEmails((atual) => (atual.includes(valor) ? atual : [...atual, valor]));
    setRascunho("");
  }

  function remover(indice: number) {
    setEmails((atual) => atual.filter((_, i) => i !== indice));
  }

  function aoDigitar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      confirmar();
    } else if (e.key === "Backspace" && rascunho === "" && emails.length > 0) {
      remover(emails.length - 1);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2">
        {emails.map((email, indice) => (
          <span
            key={email}
            className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 py-1 pl-2.5 pr-1.5 text-sm text-neutral-100"
          >
            {email}
            <button
              type="button"
              onClick={() => remover(indice)}
              className="text-neutral-500 hover:text-neutral-200"
              aria-label={`Remover ${email}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={aoDigitar}
          onBlur={confirmar}
          placeholder={emails.length === 0 ? "cliente@exemplo.com" : "adicionar outro…"}
          className="min-w-[10rem] flex-1 bg-transparent py-1 text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
        />
      </div>

      {emails.map((email) => (
        <input key={email} type="hidden" name="relatorio_email" value={email} />
      ))}
      {PARECE_EMAIL.test(rascunho.trim()) && <input type="hidden" name="relatorio_email" value={rascunho.trim()} />}

      <p className="mt-1.5 text-xs text-neutral-500">
        Aperta Enter (ou vírgula) depois de cada e-mail pra adicionar mais de um.
      </p>
    </div>
  );
}
