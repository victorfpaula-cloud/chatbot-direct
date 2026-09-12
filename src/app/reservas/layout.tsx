import type { Metadata } from "next";
import { headers } from "next/headers";
import { SplashReservas } from "./SplashReservas";

// Só essa área (onde o funcionário vive — ele não acessa mais nada além de /reservas) ganha um
// ícone e um manifest próprios, pra quando alguém adicionar essa tela à tela de início do
// celular. O resto do app continua com o ícone e o manifest de sempre (src/app/manifest.ts), sem
// nenhuma mudança — o ícone da PÁGINA (apple-icon.png/icon.png) já vem sozinho por estar dentro
// desta mesma pasta, o Next.js aplica automaticamente só pra rotas daqui pra baixo.
export const metadata: Metadata = {
  manifest: "/reservas-manifest.webmanifest",
};

/** Abrir o app de verdade pelo ícone da tela de início chega SEM cabeçalho Referer (não existe
 * "página anterior" na mesma aba/processo) — bem diferente de trocar de tela clicando em
 * Antigas/Hoje/Futuras, editar uma reserva, etc., que sempre chega com o Referer apontando pra
 * uma página nossa. Decidido aqui, no servidor, direto desse cabeçalho da própria requisição.
 * Tentamos sessionStorage e depois um cookie lido no cliente antes disso — nenhum dos dois se
 * mostrou confiável pra esse fim num app instalado (standalone) no iOS/WebKit, a splash
 * continuava reaparecendo em navegações internas. Sem depender de nenhuma API de armazenamento do
 * navegador, essa checagem não tem como "esquecer" nada entre uma tela e outra. */
function pareceAberturaDoApp(): boolean {
  const cabecalhos = headers();
  const referer = cabecalhos.get("referer");
  if (!referer) return true;

  try {
    const urlDoReferer = new URL(referer);
    const mesmaOrigem = urlDoReferer.host === cabecalhos.get("host");
    // Veio de uma página nossa de /reservas — é troca de tela dentro do app, não abertura.
    return !(mesmaOrigem && urlDoReferer.pathname.startsWith("/reservas"));
  } catch {
    // Referer mal-formado — mais seguro deixar a splash aparecer à toa uma vez do que nunca
    // aparecer quando devia.
    return true;
  }
}

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  const mostrarSplash = pareceAberturaDoApp();

  return (
    <>
      {mostrarSplash && (
        <>
          {/* Roda antes de qualquer coisa aparecer: se a splash de vídeo vai mesmo aparecer agora
              (mesma condição usada dentro dela — instalado; já sabemos por `mostrarSplash` que
              parece uma abertura de verdade), segura a animação de entrada dos containers (ver
              globals.css) parada no primeiro quadro. Sem isso ela já teria terminado de rodar,
              escondida atrás da splash, muito antes dela sumir. */}
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
      {/* Trocas de tela (Referer de uma página nossa) caem só na barrinha simples de sempre — ver
          reservas/loading.tsx — em vez da splash em vídeo, que fica reservada pra abertura de
          verdade do app. */}
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
