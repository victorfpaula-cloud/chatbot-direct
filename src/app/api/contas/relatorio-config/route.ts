import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Salva o e-mail de destino e liga/desliga o envio automático de toda segunda-feira — não dispara
// nenhum envio por si só (isso é /api/contas/relatorio-enviar ou o cron semanal).
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();
  const email = formData.get("relatorio_email")?.toString().trim() ?? "";
  const habilitado = formData.get("relatorio_habilitado")?.toString() === "1";

  if (!accountId) {
    return NextResponse.redirect(new URL("/contas", request.url));
  }

  if (habilitado && !email) {
    return NextResponse.redirect(
      new URL(
        `/contas/${accountId}/relatorios?erro=${encodeURIComponent(
          "Precisa cadastrar um e-mail antes de ligar o envio automático."
        )}`,
        request.url
      )
    );
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      relatorio_email: email || null,
      relatorio_habilitado: habilitado,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao salvar configuração de relatório:", error);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/relatorios?erro=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/relatorios?salvo=1`, request.url));
}
