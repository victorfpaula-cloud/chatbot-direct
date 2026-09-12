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
          "100%": { opacity: "1", transform: "translateY(0)" },
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
