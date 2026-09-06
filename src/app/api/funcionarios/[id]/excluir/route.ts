import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Excluir o funcionário já derruba a sessão dele na hora (chatbot_funcionario_sessoes tem
// `on delete cascade` pro funcionário) — não precisa fazer mais nada além de apagar a linha.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = criarClienteAdmin();

  const { data: funcionario } = await admin
    .from("chatbot_funcionarios")
    .select("account_id")
    .eq("id", params.id)
    .maybeSingle();

  await admin.from("chatbot_funcionarios").delete().eq("id", params.id);

  const destino = funcionario?.account_id
    ? `/contas/${funcionario.account_id}/funcionarios`
    : "/contas";

  return NextResponse.redirect(new URL(destino, request.url));
}
