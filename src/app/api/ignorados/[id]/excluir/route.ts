import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = criarClienteAdmin();

  const { data: ignorado } = await admin
    .from("chatbot_ignorados")
    .select("account_id")
    .eq("id", params.id)
    .maybeSingle();

  await admin.from("chatbot_ignorados").delete().eq("id", params.id);

  const destino = ignorado?.account_id ? `/contas/${ignorado.account_id}/ignorados` : "/contas";

  return NextResponse.redirect(new URL(destino, request.url));
}
