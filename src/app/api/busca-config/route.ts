import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();

  if (!accountId) {
    return NextResponse.redirect(new URL(`/contas`, request.url));
  }

  const buscaAutomaticaUrl = formData.get("busca_automatica_url")?.toString().trim() ?? "";

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      busca_automatica_url: buscaAutomaticaUrl || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao salvar configuração de busca automática:", error);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/busca?erro=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/busca?salvo=1`, request.url));
}
