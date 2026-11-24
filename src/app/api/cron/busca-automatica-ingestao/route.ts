import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { sincronizarTodasAsContas } from "@/lib/buscaAutomatica";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Disparado pelo Cron da Vercel uma vez por dia, de manhã (ver vercel.json) — lê o site cadastrado
 * em /contas/[id]/busca de cada conta com Busca ao Vivo ligada e guarda uma cópia interna do
 * conteúdo (ver buscaAutomatica.ts). NUNCA acessa o site ao vivo durante uma conversa de cliente —
 * só aqui, uma vez por dia.
 *
 * Mesma proteção por Authorization/CRON_SECRET de /api/cron/relatorio-semanal (ver comentário lá).
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const resultados = await sincronizarTodasAsContas(admin);
  return NextResponse.json({ ok: true, contas: resultados });
}
