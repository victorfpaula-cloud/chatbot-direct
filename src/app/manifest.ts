import type { MetadataRoute } from "next";

// Sem isso, o Android/Chrome ("Instalar app") abre o ícone em "/" (só um redirect pra /contas) em
// vez de já cair direto lá. No iOS o efeito principal de ficar "sem a barra do Safari" em toda
// página vem do `appleWebApp` em layout.tsx — esse manifest aqui é o complemento padrão da web
// (Android/Chrome, e o resto das ferramentas que checam por um manifest.json).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chatbot Direct",
    short_name: "Chatbot Direct",
    start_url: "/contas",
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
