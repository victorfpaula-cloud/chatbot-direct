import type { Metadata } from "next";
import { SplashReservas } from "./SplashReservas";

// Só essa área (onde o funcionário vive — ele não acessa mais nada além de /reservas) ganha um
// ícone e um manifest próprios, pra quando alguém adicionar essa tela à tela de início do
// celular. O resto do app continua com o ícone e o manifest de sempre (src/app/manifest.ts), sem
// nenhuma mudança — o ícone da PÁGINA (apple-icon.png/icon.png) já vem sozinho por estar dentro
// desta mesma pasta, o Next.js aplica automaticamente só pra rotas daqui pra baixo.
export const metadata: Metadata = {
  manifest: "/reservas-manifest.webmanifest",
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Roda antes de qualquer coisa aparecer: se a splash de vídeo vai mesmo aparecer agora
          (mesma condição usada dentro dela — instalado + ainda não mostrada nessa aba), segura a
          animação de entrada dos containers (ver globals.css) parada no primeiro quadro. Sem isso
          ela já teria terminado de rodar, escondida atrás da splash, muito antes dela sumir. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                var instalado =
                  window.matchMedia("(display-mode: standalone)").matches ||
                  navigator.standalone === true;
                if (!instalado) return;
                if (sessionStorage.getItem("reservas_splash_ja_mostrada") === "1") return;
                document.documentElement.classList.add("cd-aguardando-splash-reservas");
              } catch (e) {}
            })();
          `,
        }}
      />
      <SplashReservas />
      {children}
    </>
  );
}
