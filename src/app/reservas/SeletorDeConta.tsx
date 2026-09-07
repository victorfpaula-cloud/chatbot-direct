"use client";

import { useRouter } from "next/navigation";

export function SeletorDeConta({
  contas,
  contaSelecionadaId,
  hrefs,
}: {
  contas: { id: string; page_name: string }[];
  contaSelecionadaId: string;
  hrefs: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <select
      value={contaSelecionadaId}
      onChange={(evento) => router.push(hrefs[evento.target.value])}
      className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200"
    >
      {contas.map((conta) => (
        <option key={conta.id} value={conta.id}>
          {conta.page_name}
        </option>
      ))}
    </select>
  );
}
