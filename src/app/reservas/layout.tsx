import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SplashReservas, NOME_DO_COOKIE_JA_MOSTRADA } from "./SplashReservas";

// Só essa área (onde o funcionário vive — ele não acessa mais nada além de /reservas) ganha um
// ícone e um manifest próprios, pra quando alguém adicionar essa tela à tela de início do
// celular. O resto do app continua com o ícone e o manifest de sempre (src/app/manifest.ts), sem
// nenhuma mudança — o ícone da PÁGINA (apple-icon.png/icon.png) já vem sozinho por estar dentro
// desta mesma pasta, o Next.js aplica automaticamente só pra rotas daqui pra baixo.
export const metadata: Metadata = {
  manifest: "/reservas-manifest.webmanifest",
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  // Decidido no SERVIDOR, direto do cookie que já veio junto com essa requisição — nenhuma
  // dependência de sessionStorage/cookie lido depois, no cliente, correndo contra a primeira
  // pintura da tela. Se esse cookie já existe, a splash NEM É ENVIADA no HTML dessa vez: não tem
  // como ela "aparecer de novo" numa navegação onde o próprio servidor já sabe que não precisa
  // mandar ela. (O que o servidor não sabe é se o app está em modo instalado/standalone — isso só
  // o cliente descobre, então essa parte continua sendo decidida lá dentro de SplashReservas.)
  const jaMostrouSplash = cookies().get(NOME_DO_COOKIE_JA_MOSTRADA)?.value === "1";

  return (
    <>
      {!jaMostrouSplash && (
        <>
          {/* Roda antes de qualquer coisa aparecer: se a splash de vídeo vai mesmo aparecer agora
              (mesma condição usada dentro dela — instalado, e o cookie acima já garante que ainda
              não foi mostrada), segura a animação de entrada dos containers (ver globals.css)
              parada no primeiro quadro. Sem isso ela já teria terminado de rodar, escondida atrás
              da splash, muito antes dela sumir. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  try {
                    var instalado =
                      window.matchMedia("(display-mode: standalone)").matches ||
                      navigator.standalone === true;
                    if (!instalado) return;
                    document.documentElement.classList.add("cd-aguardando-splash-reservas");
                  } catch (e) {}
                })();
              `,
            }}
          />
          <SplashReservas />
        </>
      )}
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
            "radial-gradient(640px circle at 8% 0%, rgba(79,70,229,0.10), transparent 70%)," +
            "radial-gradient(600px circle at 100% 28%, rgba(139,92,246,0.09), transparent 70%)," +
            "radial-gradient(560px circle at 4% 100%, rgba(245,158,11,0.08), transparent 70%)",
        }}
      >
        {children}
      </div>
    </>
  );
}
