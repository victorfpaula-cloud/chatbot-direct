import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { montarRelatorioSemanal } from "@/lib/relatorioSemanal";
import { enviarRelatorioSemanal } from "@/lib/email";
import { segundaDaSemanaPassadaEmSaoPauloISO } from "@/lib/datas";

// Botão "Enviar agora" da tela de relatórios — manda pro e-mail JÁ cadastrado nessa conta, sobre a
// última semana civil completa (segunda a domingo), a qualquer dia da semana que for clicado.
// Ao contrário do cron semanal (que já espera acontecer erro isolado numa conta sem travar as
// outras), aqui o resultado precisa aparecer na tela pra quem clicou saber se funcionou de
// verdade — Resend aceita a chamada mesmo quando não vai entregar (ver aviso em src/lib/email.ts
// sobre a restrição do remetente onboarding@resend.dev).
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();

  if (!accountId) {
    return NextResponse.redirect(new URL("/contas", request.url));
  }

  const admin = criarClienteAdmin();
  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select("relatorio_email")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!config?.relatorio_email) {
    return NextResponse.redirect(
      new URL(
        `/contas/${accountId}/relatorios?erro=${encodeURIComponent("Cadastra um e-mail antes de enviar.")}`,
        request.url
      )
    );
  }

  const relatorio = await montarRelatorioSemanal(admin, accountId, segundaDaSemanaPassadaEmSaoPauloISO());
  const resultado = await enviarRelatorioSemanal(config.relatorio_email, relatorio);

  if (!resultado.sucesso) {
    return NextResponse.redirect(
      new URL(
        `/contas/${accountId}/relatorios?erro=${encodeURIComponent(
          resultado.erro ?? "Falha ao enviar o relatório."
        )}`,
        request.url
      )
    );
  }

  await admin
    .from("chatbot_account_settings")
    .update({ relatorio_ultimo_envio_em: new Date().toISOString() })
    .eq("account_id", accountId);

  return NextResponse.redirect(new URL(`/contas/${accountId}/relatorios?enviado=1`, request.url));
}
