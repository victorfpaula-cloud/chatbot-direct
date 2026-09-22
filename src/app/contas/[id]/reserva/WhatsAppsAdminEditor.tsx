"use client";

import { useState } from "react";

/** Lista de WhatsApps que recebem o alerta de lotação — zero, um ou vários. Cada linha manda um
 * input com o MESMO name ("reserva_admin_whatsapp"); o form nativo já entrega isso pro servidor
 * como uma lista (formData.getAll), sem precisar juntar tudo numa string separada por vírgula na
 * hora de digitar — só guardamos assim (ver reserva-config/route.ts). */
export default function WhatsAppsAdminEditor({ valorInicial }: { valorInicial: string }) {
  const iniciais = valorInicial
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const [numeros, setNumeros] = useState<string[]>(iniciais.length > 0 ? iniciais : [""]);

  function atualizar(indice: number, valor: string) {
    setNumeros((atual) => atual.map((n, i) => (i === indice ? valor : n)));
  }

  function remover(indice: number) {
    setNumeros((atual) => (atual.length === 1 ? [""] : atual.filter((_, i) => i !== indice)));
  }

  function adicionar() {
    setNumeros((atual) => [...atual, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {numeros.map((numero, indice) => (
        <div key={indice} className="flex items-center gap-2">
          <input
            type="text"
            name="reserva_admin_whatsapp"
            value={numero}
            onChange={(e) => atualizar(indice, e.target.value)}
            placeholder="11999998888"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => remover(indice)}
            className="shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            aria-label="Remover esse WhatsApp"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={adicionar}
        className="self-start text-sm text-indigo-400 hover:text-indigo-300"
      >
        + adicionar outro WhatsApp
      </button>
    </div>
  );
}
