import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Liga/desliga só o Chatbot Direct (palavra-chave + Gemini) de uma conta — diferente do "Pausar"
// em /api/contas/status, que desliga TUDO (reserva, agendamento, busca e direct juntos). Mesmo
// espírito de /api/contas/reservas-status e /api/contas/agendamento-status (ver comentários lá).
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
      chatbot_direct_habilitado: habilitar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao ativar/desativar Chatbot Direct:", error);
    return NextResponse.redirect(new URL(`${voltarPara}?erro=falha_ao_ativar_direct`, request.url));
  }

  return NextResponse.redirect(new URL(voltarPara, request.url));
}
