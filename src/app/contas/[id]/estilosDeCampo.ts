// Classes de campo compartilhadas entre todas as abas de conta (Reserva/Agendamento/Busca
// Automática/etc.) — mesmo espírito de CLASSE_CARTAO_DO_DIA em reservasCompartilhado.tsx: um
// lugar só pra manter o visual consistente entre várias telas, em vez de repetir a mesma string
// de Tailwind colada em cada campo de cada arquivo.
export const CLASSE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30";
export const CLASSE_CAMPO_TEXTAREA = `${CLASSE_CAMPO} resize-y`;
export const CLASSE_RÓTULO = "text-xs font-medium text-neutral-400";
export const CLASSE_AJUDA = "mt-1.5 text-xs leading-relaxed text-neutral-500";
export const CLASSE_CHECKBOX = "h-4 w-4 rounded border-white/20 bg-black/25 accent-indigo-500";
export const CLASSE_BOTAO_SALVAR =
  "mt-2 self-start rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-2.5 text-sm font-semibold text-indigo-200 transition hover:border-indigo-400/50 hover:bg-indigo-500/20";
export const CLASSE_AVISO_SALVO =
  "mt-4 rounded-xl border border-emerald-800/50 bg-emerald-950/50 px-4 py-2.5 text-sm text-emerald-300";
export const CLASSE_AVISO_ERRO =
  "mt-4 break-words rounded-xl border border-red-800/50 bg-red-950/50 px-4 py-2.5 text-sm text-red-300";
export const CLASSE_ESTADO_DESLIGADO =
  "mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8";
// Wrapper de seção "cru" (mesmo visual de CartaoDeSecao.tsx) — usado nos formulários grandes
// já existentes (Reserva/Agendamento) que têm título/descrição misturados no meio de outros
// elementos (checkbox, editor customizado) e por isso não encaixam direto na API de props de
// CartaoDeSecao (que só aceita título+descrição simples). Mesmas classes, sem o componente.
export const CLASSE_SECAO =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_-12px_rgba(0,0,0,0.5)] [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]";
export const CLASSE_TITULO_SECAO = "text-sm font-semibold text-neutral-100";
