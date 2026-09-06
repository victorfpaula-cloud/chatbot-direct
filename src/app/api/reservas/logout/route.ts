import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value;

  if (token) {
    const admin = criarClienteAdmin();
    await admin.from("chatbot_funcionario_sessoes").delete().eq("token", token);
  }

  const resposta = NextResponse.redirect(new URL("/reservas/login", request.url));
  resposta.cookies.delete(NOME_DO_COOKIE_DE_SESSAO);
  return resposta;
}
