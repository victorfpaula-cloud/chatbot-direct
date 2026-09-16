import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { montarRelatorio } from "@/lib/relatorioSemanal";
import { enviarRelatorioSemanal } from "@/lib/email";
import { ultimosDiasTerminandoOntemEmSaoPauloISO } from "@/lib/datas";

export const dynamic = "force-dynamic";

/**
 * Disparado pelo Cron da Vercel toda segunda-feira de manhã (ver vercel.json) — manda o relatório
 * dos últimos 7 dias (terminando ontem, domingo — a semana que acabou de passar) pro e-mail
 * cadastrado em toda conta que ligou "Enviar automaticamente" em /contas/[id]/relatorios.
 *
 * Mesma proteção por Authorization/CRON_SECRET de /api/cron/lembrete-reservas (ver comentário lá).
 * Uma conta falhando (Resend fora do ar, e-mail inválido, etc.) não pode travar o envio das
 * outras — por isso cada envio roda dentro do próprio try/catch, e o resultado de todas aparece
 * na resposta pra dar pra conferir no log da Vercel depois.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const periodo = ultimosDiasTerminandoOntemEmSaoPauloISO(7);

  const { data: contasHabilitadas } = await admin
    .from("chatbot_account_settings")
    .select("account_id, relatorio_email")
    .eq("relatorio_habilitado", true)
    .not("relatorio_email", "is", null);

  const resultados: { accountId: string; sucesso: boolean; erro?: string }[] = [];

  for (const config of contasHabilitadas ?? []) {
    if (!config.relatorio_email) continue;
    try {
      const relatorio = await montarRelatorio(admin, config.account_id, periodo);
      const resultado = await enviarRelatorioSemanal(config.relatorio_email, relatorio);
      resultados.push({ accountId: config.account_id, ...resultado });

      if (resultado.sucesso) {
        await admin
          .from("chatbot_account_settings")
          .update({ relatorio_ultimo_envio_em: new Date().toISOString() })
          .eq("account_id", config.account_id);
      }
    } catch (erro) {
      console.error(`Falha ao processar relatório semanal da conta ${config.account_id}:`, erro);
      resultados.push({ accountId: config.account_id, sucesso: false, erro: "Erro inesperado" });
    }
  }

  return NextResponse.json({ ok: true, periodo, resultados });
}
