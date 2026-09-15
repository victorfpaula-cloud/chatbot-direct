"use client";

import { useState } from "react";

const PADRAO = "#818cf8";

/** Seletor de cor + campo de texto sincronizados entre si (mudar um atualiza o outro) — mesmo
 * padrão de "editor pequeno dentro de um form comum" do DatasBloqueadasEditor. Só o campo de texto
 * (`cor_destaque_manual`) é enviado no submit; o seletor de cor é só uma forma mais fácil de
 * preencher ele. */
export default function CorDeDestaqueEditor({ valorInicial }: { valorInicial: string }) {
  const [cor, setCor] = useState(valorInicial);

  const corValidaParaOSeletor = /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : PADRAO;

  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={corValidaParaOSeletor}
        onChange={(e) => setCor(e.target.value)}
        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950"
      />
      <input
        type="text"
        name="cor_destaque_manual"
        value={cor}
        onChange={(e) => setCor(e.target.value)}
        placeholder="Ex: #9c3b2c (vermelho queimado)"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
    </div>
  );
}
