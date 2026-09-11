/**
 * Placeholder instantâneo enquanto a página de baixo (que busca dados no Supabase) ainda está
 * carregando — sem esse arquivo, o Next.js não manda NENHUM html pro navegador até a busca de
 * dados terminar, e é isso que fazia aparecer uma tela branca por 1-2s antes da splash (em
 * SplashReservas.tsx, dentro do layout) sequer aparecer. Com esse arquivo, o Next.js já manda o
 * layout (splash incluída) na hora, e só troca esse placeholder pela tela de verdade quando ela
 * ficar pronta. Mesma cor de fundo da splash e do manifest — zero flash de cor no meio do caminho.
 */
export default function CarregandoReservas() {
  return <div className="fixed inset-0 bg-[#171717]" />;
}
