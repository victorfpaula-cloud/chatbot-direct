import type { Metadata } from "next";
import { headers } from "next/headers";
import { Outfit } from "next/font/google";
import { SplashReservas } from "./SplashReservas";
import { IndicadorDeCarregamento } from "./IndicadorDeCarregamento";
import { BannerInstalarApp } from "./BannerInstalarApp";
import { DefinicoesDoVidroLiquido } from "./VidroLiquido";

// Só a área de reservas (o "painel de funcionário") ganha essa fonte por enquanto — o painel
// administrativo (/contas) continua com a fonte de sempre até o mesmo redesign chegar lá.
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

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
      <IndicadorDeCarregamento />
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
      {/* Fundo "atmosfera" — mesmas três manchas coloridas desfocadas (cores e posições idênticas)
          da home de vendas (src/app/site/pagina.module.css, .o1/.o2/.o3), pedido pelo Victor pra
          o vidro dos cartões ter cor de verdade pra refratar, em vez do degradê quase apagado de
          antes. A faixa/corte visível em telas curtas (Antigas/Futuras) que tinha feito a versão
          anterior de "manchas + fixed" ser revertida vinha do container sendo posicionado relativo
          ao DOCUMENTO (altura variável por tela) — aqui ele é `position: fixed; inset: 0`, do
          mesmo jeito que o site: sempre do tamanho exato da viewport, nunca do documento, então o
          alcance do brilho é sempre o mesmo não importa quão curta a tela seja. */}
      <div className={`relative min-h-dvh bg-[#050509] ${outfit.className}`}>
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute rounded-full"
            style={{
              width: "60vmax",
              height: "60vmax",
              top: "-30vmax",
              left: "-18vmax",
              background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 62%)",
              mixBlendMode: "screen",
              filter: "blur(4vmax)",
            }}
          />
          {/* Essa (violeta, canto direito) mais espalhada/difusa que as outras duas de propósito
              (blur bem maior + degradê esticado até 85%, pico um pouco mais fraco pra compensar) —
              pedido do Victor depois de ver ela concentrada demais, com uma borda meio dura, no
              meio da tela. */}
          <div
            className="absolute rounded-full"
            style={{
              width: "50vmax",
              height: "50vmax",
              top: "30vmax",
              right: "-20vmax",
              background: "radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 85%)",
              mixBlendMode: "screen",
              filter: "blur(9vmax)",
            }}
          />
          {/* Terceira mancha acinzentada (não rosa/roxa como as outras duas) — mesma cor exata do
              site, pensada pra suavizar o canto de baixo em vez de continuar saturando com mais
              índigo/violeta. */}
          <div
            className="absolute rounded-full"
            style={{
              width: "40vmax",
              height: "40vmax",
              bottom: "-18vmax",
              left: "10vmax",
              background: "radial-gradient(circle, rgba(199,207,251,0.28) 0%, transparent 62%)",
              mixBlendMode: "screen",
              filter: "blur(4vmax)",
            }}
          />
        </div>

        <div className="relative z-10">{children}</div>
        <DefinicoesDoVidroLiquido />
      </div>
      <BannerInstalarApp />
    </>
  );
}
