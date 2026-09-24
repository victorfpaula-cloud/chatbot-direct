import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { processarLembretesDeReserva } from "@/lib/lembreteDeReserva";

export const dynamic = "force-dynamic";

/**
 * Disparado por um cronjob externo no cron-job.org (gratuito, a cada 10min), NÃO mais pelo Cron
 * da Vercel — manda o lembrete de "reserva hoje" por WhatsApp pra quem já confirmou reserva pro
 * dia, nas contas que ligaram isso em /contas/[id]/reserva.
 *
 * Motivo da troca: o plano gratuito da Vercel limita cron a 1 execução por dia, num horário fixo.
 * processarLembretesDeReserva (ver lembreteDeReserva.ts) foi escrito pra rodar com frequência —
 * cada conta tem seu próprio reserva_lembrete_horario, e só dispara no primeiro run em ou depois
 * desse horário — então com só 1 execução/dia, qualquer conta cujo horário não batesse EXATAMENTE
 * com o horário do cron nunca recebia o lembrete (bug real, descoberto em produção em 23/09/2026).
 * Chegou a ser movido pro GitHub Actions primeiro, mas trocado de novo pro cron-job.org — GitHub
 * Actions é uma ferramenta de CI, não um serviço de cron de verdade, e o Victor já vinha tendo
 * atraso/falha com Schedule do Actions em outro projeto dele.
 *
 * Protegido pelo header Authorization com um Bearer token comparado contra a env var CRON_SECRET
 * — o cronjob no cron-job.org manda esse mesmo header customizado, configurado na hora de criar o
 * job (ver painel do cron-job.org). Sem essa env var configurada, a rota recusa TODA chamada (fail
 * closed: melhor o lembrete não disparar do que qualquer um na internet conseguir mandar mensagem
 * em nome do restaurante pra quem reservou).
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
