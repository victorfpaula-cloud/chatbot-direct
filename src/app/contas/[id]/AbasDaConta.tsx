"use client";

import { usePathname } from "next/navigation";

const ABAS = [
  { segmento: "palavras-chave", rotulo: "Palavras-chave" },
  { segmento: "gemini", rotulo: "Gemini" },
  { segmento: "reserva", rotulo: "Reserva" },
  { segmento: "agendamento", rotulo: "Agendamento" },
  { segmento: "atendimentos", rotulo: "Atendimentos" },
  { segmento: "ignorados", rotulo: "Ignorados" },
  { segmento: "funcionarios", rotulo: "Funcionários" },
];

/**
 * Menu de abas de cada conta (Palavras-chave / Gemini / Reserva / Atendimentos), agora destacando
 * qual aba está aberta no momento. Precisa ser Client Component só por causa do `usePathname()`
 * (é o único jeito de saber qual página está ativa) — os links continuam sendo `<a href>` normais
 * (recarregam a página inteira, como todo o resto do site), então não muda nada da navegação em
 * si, só o visual de qual aba está selecionada.
 */
export default function AbasDaConta({ contaId }: { contaId: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-2 [backdrop-filter:blur(16px)_url(#vidro-abas-contas)] [-webkit-backdrop-filter:blur(16px)_url(#vidro-abas-contas)]">
      {ABAS.map((aba) => {
        const href = `/contas/${contaId}/${aba.segmento}`;
        const ativa = pathname?.startsWith(href) ?? false;

        return (
          <a
            key={aba.segmento}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              ativa
                ? "bg-indigo-500 font-medium text-white shadow-md shadow-indigo-950/40"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {aba.rotulo}
          </a>
        );
      })}
    </nav>
  );
}
