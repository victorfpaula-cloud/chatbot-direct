import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios";
import { NOME_DO_COOKIE_DE_VERIFICACAO, NOME_DO_COOKIE_DE_CONTA_ATIVA } from "@/lib/funcionarios-cookie";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value;

  if (token) {
    const admin = criarClienteAdmin();
    await admin.from("chatbot_funcionario_sessoes").delete().eq("token", token);
  }

  const resposta = NextResponse.redirect(new URL("/reservas/login", request.url));
  resposta.cookies.delete(NOME_DO_COOKIE_DE_SESSAO);
  // Sem isso, o carimbo de confiança (ver funcionarios-cookie.ts) continuaria válido por até 7
  // dias mesmo depois do logout — o token que ele referencia já não existe mais no banco, mas o
  // middleware só reconfere lá quando o carimbo vence. Limpando os dois juntos, o logout corta o
  // acesso na hora, como sempre foi.
  resposta.cookies.delete(NOME_DO_COOKIE_DE_VERIFICACAO);
  resposta.cookies.delete(NOME_DO_COOKIE_DE_CONTA_ATIVA);
  return resposta;
}
