import { Outfit } from "next/font/google";
import { DefinicoesDoVidroLiquidoContas } from "./VidroLiquido";

// Mesma fonte já usada em /reservas, agora também no painel administrativo — não muda nada na
// área de reservas nem na raiz do site (root layout continua com a fonte padrão pra /login etc).
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export default function ContasLayout({ children }: { children: React.ReactNode }) {
  return (
    // Fundo com brilhos suaves em degradê (mesmo espírito do fundo de /reservas) — sem isso, a
    // refração de vidro (feDisplacementMap) não tem nada de colorido pra distorcer atrás dela e o
    // efeito fica invisível: borrar uma cor lisa dá nela mesma, lisa.
    <div
      className={`min-h-dvh ${outfit.className}`}
      style={{
        backgroundImage:
          "radial-gradient(640px circle at 6% 0%, rgba(79,70,229,0.12), transparent 70%)," +
          "radial-gradient(600px circle at 100% 22%, rgba(139,92,246,0.10), transparent 70%)," +
          "radial-gradient(560px circle at 8% 100%, rgba(245,158,11,0.07), transparent 70%)",
      }}
    >
      {children}
      <DefinicoesDoVidroLiquidoContas />
    </div>
  );
}
