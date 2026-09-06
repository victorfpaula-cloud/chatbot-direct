import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  NOME_DO_COOKIE_DE_SESSAO,
  calcularExpiracaoDaSessao,
  gerarTokenDeSessao,
  senhaConfere,
} from "@/lib/funcionarios";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const usuario = formData.get("usuario")?.toString().trim() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";

  if (!usuario || !senha) {
    return NextResponse.redirect(
      new URL("/reservas/login?erro=Preenche usuário e senha.", request.url)
    );
  }

  const admin = criarClienteAdmin();

  const { data: funcionario, error } = await admin
    .from("chatbot_funcionarios")
    .select("id, senha_hash")
    .eq("usuario", usuario)
    .maybeSingle();

  // Mesma mensagem genérica pra usuário inexistente ou senha errada — não dá pra alguém tentando
  // adivinhar descobrir se um nome de usuário existe ou não só pela resposta.
  if (error || !funcionario || !senhaConfere(senha, funcionario.senha_hash)) {
    return NextResponse.redirect(
      new URL("/reservas/login?erro=Usuário ou senha incorretos.", request.url)
    );
  }

  const token = gerarTokenDeSessao();

  const { error: erroAoCriarSessao } = await admin.from("chatbot_funcionario_sessoes").insert({
    funcionario_id: funcionario.id,
    token,
    expira_em: calcularExpiracaoDaSessao(),
  });

  if (erroAoCriarSessao) {
    console.error("Falha ao criar sessão de funcionário:", erroAoCriarSessao);
    return NextResponse.redirect(
      new URL("/reservas/login?erro=Deu um erro pra entrar. Tenta de novo.", request.url)
    );
  }

  const resposta = NextResponse.redirect(new URL("/reservas", request.url));
  resposta.cookies.set(NOME_DO_COOKIE_DE_SESSAO, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return resposta;
}
