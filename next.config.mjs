/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Todas as páginas do app (não os arquivos estáticos do _next, ícones, manifest ou o
        // vídeo da splash — ver bloco abaixo) — força o navegador, principalmente o Safari no
        // iPhone/iPad, a sempre buscar a versão mais nova em vez de reaproveitar uma tela antiga
        // guardada no cache. sw.js fica de fora de propósito (continua no-store): é o service
        // worker das notificações push, precisa ser sempre revalidado pra não demorar a pegar
        // atualização de código.
        source:
          "/((?!_next/static|_next/image|icon.png|apple-icon.png|reservas/icon.png|reservas/apple-icon.png|reservas-manifest.webmanifest|reservas-logo.png|reservas-icon.png|reservas-splash.mp4).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
      {
        // Ícones, manifest e o vídeo da tela de abertura: arquivos estáticos que só mudam quando
        // alguém troca o arquivo de propósito. Cacheados por 7 dias — cada vez que o app é aberto
        // deixa de baixar o vídeo de novo, economizando banda da Vercel e dado do celular de quem
        // usa. Se um desses arquivos for substituído no futuro, troque o NOME do arquivo (ex.:
        // reservas-splash-v2.mp4) em vez de só sobrescrever o conteúdo — senão quem já abriu o
        // app antes fica com a versão velha em cache por até 7 dias.
        source:
          "/(icon.png|apple-icon.png|reservas/icon.png|reservas/apple-icon.png|reservas-manifest.webmanifest|reservas-logo.png|reservas-icon.png|reservas-splash.mp4)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
