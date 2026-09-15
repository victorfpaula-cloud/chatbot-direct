import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarContaPorSlug, montarConfigPublica } from "@/lib/reservaExterna";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = criarClienteAdmin();

  const conta = await buscarContaPorSlug(admin, slug);
  if (!conta) {
    return NextResponse.json({ erro: "conta não encontrada" }, { status: 404 });
  }

  const config = await montarConfigPublica(admin, conta);
  return NextResponse.json(config);
}
