import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Liga/desliga o Agendamento de uma conta — igual ao /api/contas/reservas-status, só que pra
// coluna agendamento_habilitada. Arquivo separado de propósito: mexer aqui nunca toca no
// interruptor de Reservas.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();
  const habilitar = formData.get("habilitar")?.toString() === "1";
  const voltarPara = formData.get("redirect_to")?.toString() || "/contas";

  if (!accountId) {
    return NextResponse.redirect(new URL("/contas", request.url));
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      agendamento_habilitado: habilitar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao ativar/desativar Agendamento:", error);
    return NextResponse.redirect(new URL(`${voltarPara}?erro=falha_ao_ativar_agendamento`, request.url));
  }

  return NextResponse.redirect(new URL(voltarPara, request.url));
}
