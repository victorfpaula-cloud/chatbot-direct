import { notFound } from "next/navigation";
import { Fraunces, Outfit } from "next/font/google";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarContaPorSlug, montarConfigPublica, slugPertenceAContaPausada } from "@/lib/reservaExterna";
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
  if (!conta) {
    // Existe conta com esse slug, só que pausada (ver botão Pausar em /contas — ex.: cliente não
    // pagou) — em vez do 404 genérico do Next (que pareceria um link quebrado/errado), mostra que
    // o serviço em si existe mas está temporariamente fora do ar. Slug que nunca existiu de
    // verdade continua caindo no 404 normal, senão viraria um jeito de "adivinhar" slug pausado.
    if (await slugPertenceAContaPausada(admin, slug)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-neutral-200">Sistema temporariamente indisponível</p>
            <p className="mt-2 text-sm text-neutral-500">Tenta de novo mais tarde.</p>
          </div>
        </div>
      );
    }
    notFound();
  }

  const config = await montarConfigPublica(admin, conta);

  return (
    <div className={`${fraunces.variable} ${outfit.variable}`}>
      <ExperienciaReserva slug={slug} config={config} />
    </div>
  );
}
