import type { Metadata } from "next";

// Só essa área (onde o funcionário vive — ele não acessa mais nada além de /reservas) ganha um
// ícone e um manifest próprios, pra quando alguém adicionar essa tela à tela de início do
// celular. O resto do app continua com o ícone e o manifest de sempre (src/app/manifest.ts), sem
// nenhuma mudança — o ícone da PÁGINA (apple-icon.png/icon.png) já vem sozinho por estar dentro
// desta mesma pasta, o Next.js aplica automaticamente só pra rotas daqui pra baixo.
export const metadata: Metadata = {
  manifest: "/reservas-manifest.webmanifest",
};

export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
