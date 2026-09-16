import type { ReactNode } from "react";

/**
 * Vidro (Liquid Glass) padrão pra agrupar um bloco de campos dentro de uma aba de conta —
 * substitui as caixinhas antigas (`rounded-lg border border-neutral-800 bg-neutral-900/60`,
 * lisas e sem refração) usadas em Reserva/Agendamento/etc. Referencia o mesmo filtro de refração
 * de borda (`vidro-cartao-contas`) já definido em contas/VidroLiquido.tsx — nada de filtro novo,
 * só passando a usar o que já existe também dentro de cada aba, não só nos cartões de /contas.
 */
export function CartaoDeSecao({
  titulo,
  descricao,
  children,
}: {
  titulo?: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_-12px_rgba(0,0,0,0.5)] [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]">
      {titulo && <p className="text-sm font-semibold text-neutral-100">{titulo}</p>}
      {descricao && <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{descricao}</p>}
      <div className={titulo || descricao ? "mt-4 flex flex-col gap-4" : "flex flex-col gap-4"}>{children}</div>
    </div>
  );
}
