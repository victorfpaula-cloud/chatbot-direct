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
                // Mesmo cookie de sessão que SplashReservas.tsx usa (não sessionStorage — ver
                // comentário lá, não sobrevivia de forma confiável a esses recarregamentos de
                // página inteira num app instalado no iOS).
                if (document.cookie.split("; ").indexOf("reservas_splash_ja_mostrada=1") !== -1) return;
                document.documentElement.classList.add("cd-aguardando-splash-reservas");
              } catch (e) {}
            })();
          `,
        }}
      />
      <SplashReservas />
      {/* Fundo suave (Liquid Glass) da área toda de reservas — um degradê comum (background-image
          puro, sem filter/blur nem position:fixed) em vez das manchas desfocadas + fixed de
          antes: aquilo causava uma faixa/corte visível entre onde o brilho alcançava e o resto da
          tela ficando liso, em Antigas/Futuras (telas curtas, com bastante espaço vazio embaixo).
          Um gradiente é matematicamente suave do centro até "transparent", sem parada abrupta em
          lugar nenhum — não tem como sobrar uma borda visível como acontecia antes. */}
      <div
        className="min-h-dvh"
        style={{
          backgroundImage:
            "radial-gradient(640px circle at 8% 0%, rgba(79,70,229,0.16), transparent 70%)," +
            "radial-gradient(600px circle at 100% 28%, rgba(139,92,246,0.15), transparent 70%)," +
            "radial-gradient(560px circle at 4% 100%, rgba(245,158,11,0.11), transparent 70%)",
        }}
      >
        {children}
      </div>
    </>
  );
}
