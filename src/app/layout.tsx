import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatbot Direct",
  description: "Atendimento automático de Instagram Direct",
  // Referenciado explicitamente (em vez de deixar o Next.js gerar sozinho a partir de um
  // manifest.ts na raiz) porque esse jeito automático NÃO respeita um manifest diferente
  // declarado por uma pasta filha (ver src/app/reservas/layout.tsx) — sempre usava esse daqui pra
  // toda rota do site, inclusive /reservas, fazendo o atalho da tela de início do funcionário abrir
  // em "/contas" (o start_url daqui) em vez de "/reservas". Com o campo explícito, a metadata da
  // pasta mais específica vence normalmente, como já acontece com os ícones.
  manifest: "/manifest.webmanifest",
  // Sem isso, "Adicionar à Tela de Início" no iPhone funciona só na primeira página: o Safari
  // mostra o app sem a própria barra de endereço só na abertura pelo ícone, e assim que a pessoa
  // navega pra uma segunda ou terceira página (troca de URL de verdade), o Safari "esquece" que é
  // um app instalado e volta a mostrar a barra de endereço em cima e os atalhos dele embaixo —
  // exatamente o problema relatado (05/09/2026). Com isso aqui, toda página do app avisa o iOS
  // que é pra continuar em modo app (sem chrome do navegador), não só a primeira.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chatbot Direct",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Cor de fundo direto no atributo style (não numa classe do Tailwind) de propósito: essa
    // aplica na hora que o HTML chega, sem esperar a folha de estilos terminar de carregar — é o
    // que fecha de vez qualquer chance de um flash branco antes da tela escurecer, mesmo numa
    // conexão de celular mais lenta.
    <html lang="pt-BR" style={{ backgroundColor: "#171717" }}>
      <body className="bg-neutral-900 text-neutral-100 antialiased">
        {/*
          Tela de abertura com o logo — aparece SÓ na primeira vez que o site é aberto numa aba
          (guardado em sessionStorage, então some sozinha e não volta a aparecer enquanto você
          navega entre as páginas na mesma aba). Nas trocas de página depois disso, quem aparece é
          só a barrinha fina de carregamento (`src/app/loading.tsx`), bem mais discreta.
        */}
        <div
          id="cd-splash"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 opacity-100 transition-opacity duration-500"
        >
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-800 border-t-neutral-300" />
            <div className="flex h-11 w-11 animate-pop-in items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-900">
              CD
            </div>
          </div>
        </div>
        <script
          // Roda assim que o navegador lê essa tag, antes do resto da página aparecer. Se já
          // existe a marca de "já abriu" nessa aba (sessionStorage — dura enquanto a aba estiver
          // aberta, some se fechar e abrir de novo), esconde a tela de abertura na hora. Se não
          // existe ainda, deixa aparecer por um instante e depois esconde sozinha com uma
          // transição suave.
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var el = document.getElementById("cd-splash");
                  if (!el) return;
                  // /reservas tem a própria splash (vídeo, ver SplashReservas.tsx) — essa aqui é
                  // só pro painel administrativo. Sem esse corte, as duas empilhavam: a giratória
                  // "CD" segurava a tela por pelo menos 1,2s ANTES do vídeo sequer começar.
                  if (location.pathname.indexOf("/reservas") === 0) {
                    el.style.display = "none";
                    return;
                  }
                  var jaAbriu = sessionStorage.getItem("cd_ja_abriu");
                  if (jaAbriu) {
                    el.style.display = "none";
                    return;
                  }
                  sessionStorage.setItem("cd_ja_abriu", "1");
                  setTimeout(function () {
                    el.style.opacity = "0";
                    el.style.pointerEvents = "none";
                    setTimeout(function () {
                      el.style.display = "none";
                    }, 500);
                  }, 700);
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
