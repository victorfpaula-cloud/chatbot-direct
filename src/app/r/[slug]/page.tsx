import { notFound } from "next/navigation";
import { Fraunces, Outfit } from "next/font/google";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarContaPorSlug, montarConfigPublica } from "@/lib/reservaExterna";
import { ExperienciaReserva } from "./ExperienciaReserva";

// Sempre busca a config na hora — nunca cacheia, porque uma mudança de horário/capacidade feita
// no painel (mesmas colunas usadas pelo fluxo do Instagram) tem que valer aqui imediatamente.
export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--fonte-display",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fonte-ui",
  display: "swap",
});

export default async function PaginaReservaExterna({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = criarClienteAdmin();

  const conta = await buscarContaPorSlug(admin, slug);
  if (!conta) notFound();

  const config = await montarConfigPublica(admin, conta);

  return (
    <div className={`${fraunces.variable} ${outfit.variable}`}>
      <ExperienciaReserva slug={slug} config={config} />
    </div>
  );
}
