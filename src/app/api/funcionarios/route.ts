import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarHashDeSenha } from "@/lib/funcionarios";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();
  const usuario = formData.get("usuario")?.toString().trim() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";

  if (!accountId) {
    return NextResponse.redirect(new URL("/contas", request.url));
  }

  if (!usuario || senha.length < 6) {
    return NextResponse.redirect(
      new URL(
        `/contas/${accountId}/funcionarios?erro=${encodeURIComponent(
          "Preenche o usuário e uma senha com pelo menos 6 caracteres."
        )}`,
        request.url
      )
    );
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_funcionarios").insert({
    account_id: accountId,
    usuario,
    senha_hash: gerarHashDeSenha(senha),
  });

  if (error) {
    // 23505 = unique_violation — já existe alguém com esse usuário (no sistema todo, ver
    // schema.sql).
    const mensagem =
      (error as any).code === "23505"
        ? "Já existe um funcionário com esse usuário. Escolhe outro nome."
        : error.message;

    return NextResponse.redirect(
      new URL(`/contas/${accountId}/funcionarios?erro=${encodeURIComponent(mensagem)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/funcionarios?criado=1`, request.url));
}
