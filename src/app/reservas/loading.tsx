/**
 * Placeholder instantâneo enquanto a página de baixo (que busca dados no Supabase) ainda está
 * carregando — sem esse arquivo, o Next.js não manda NENHUM html pro navegador até a busca de
 * dados terminar. Também é o que a pessoa vê ao trocar de tela (Antigas/Hoje/Futuras, editar uma
 * reserva) — a splash em vídeo (SplashReservas.tsx) fica reservada só pra abertura de verdade do
 * app, então aqui é só essa barrinha fina mesmo, no mesmo espírito da já usada no painel
 * administrativo (ver src/app/loading.tsx). Mesma cor de fundo da splash e do manifest — zero
 * flash de cor no meio do caminho.
 */
export default function CarregandoReservas() {
  return (
    <div className="fixed inset-0 bg-[#171717]">
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-cd-barra rounded-full bg-indigo-400" />
      </div>
    </div>
  );
}
