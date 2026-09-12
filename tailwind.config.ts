import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "cd-barra": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        entrada: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          // "none" (não "translateY(0)") de propósito: qualquer transform diferente de "none",
          // mesmo um que não mude nada visualmente, deixa o elemento marcado como "tem
          // transform" pro CSS pra sempre (a animação usa fill-mode "both", que mantém o valor do
          // último quadro) — e isso cria um novo contexto de empilhamento (stacking context) que
          // PRENDE qualquer z-index de dentro dele, sem deixar escapar pra cima de irmãos que
          // vêm depois no HTML (foi exatamente isso que escondia o dropdown de Filtros atrás da
          // barra de abas/cards: o cabeçalho virou um contexto à parte por causa dessa animação).
          // "none" de verdade não cria contexto nenhum, resolvendo o problema pra sempre.
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.45s ease-out",
        "cd-barra": "cd-barra 1s ease-in-out infinite",
        // Entrada suave da tela de reservas (splash/liquid glass) — some sozinha com
        // prefers-reduced-motion via motion-reduce:animate-none nas classes que a usam. Mais
        // lenta que antes (0.42s) e com um deslocamento maior (14px, era 8px) — estava tão sutil
        // que quase não dava pra perceber.
        entrada: "entrada 0.65s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
