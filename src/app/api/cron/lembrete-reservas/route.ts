import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { processarLembretesDeReserva } from "@/lib/lembreteDeReserva";

export const dynamic = "force-dynamic";

/**
 * Disparado pelo Cron da Vercel (ver vercel.json) — manda o lembrete de "reserva hoje" pro
 * Instagram de quem já confirmou reserva pro dia, nas contas que ligaram isso em
 * /contas/[id]/reserva.
 *
 * Protegido pelo header Authorization que a própria Vercel manda quando a env var CRON_SECRET
 * existe no projeto (mesmo nome, comparado aqui) — sem essa env var configurada, a rota recusa
 * TODA chamada (fail closed: melhor o lembrete não disparar do que qualquer um na internet
 * conseguir mandar mensagem em nome do restaurante pra quem reservou).
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const resultados = await processarLembretesDeReserva(admin);
  return NextResponse.json({ ok: true, contas: resultados });
}
