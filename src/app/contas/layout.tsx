import { Outfit } from "next/font/google";
import { DefinicoesDoVidroLiquidoContas } from "./VidroLiquido";

// Mesma fonte já usada em /reservas, agora também no painel administrativo — não muda nada na
// área de reservas nem na raiz do site (root layout continua com a fonte padrão pra /login etc).
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export default function ContasLayout({ children }: { children: React.ReactNode }) {
  return (
    // Mesmas manchas coloridas desfocadas de /reservas e /site (cores/posições quase idênticas,
    // só sem a animação de deriva — aqui é um painel de trabalho usado o dia todo, não uma
    // experiência de venda, ver comentário em VidroLiquido.tsx) — o degradê fraco de antes não
    // tinha cor de verdade suficiente pra refração de vidro (feDisplacementMap) distorcer: borrar
    // uma cor quase lisa dá nela mesma, quase lisa. `position: fixed` (não relative ao documento)
    // pelo mesmo motivo documentado em src/app/reservas/layout.tsx: mantém o alcance certo mesmo
    // em páginas curtas.
    <div className={`relative min-h-dvh bg-[#050509] ${outfit.className}`}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute rounded-full"
          style={{
            width: "60vmax",
            height: "60vmax",
            top: "-30vmax",
            left: "-18vmax",
            background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 62%)",
            mixBlendMode: "screen",
            filter: "blur(4vmax)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "50vmax",
            height: "50vmax",
            top: "30vmax",
            right: "-20vmax",
            background: "radial-gradient(circle, rgba(139,92,246,0.26) 0%, transparent 85%)",
            mixBlendMode: "screen",
            filter: "blur(9vmax)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "40vmax",
            height: "40vmax",
            bottom: "-18vmax",
            left: "10vmax",
            background: "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 62%)",
            mixBlendMode: "screen",
            filter: "blur(4vmax)",
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
      <DefinicoesDoVidroLiquidoContas />
    </div>
  );
}
