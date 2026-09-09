import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();
  const instagramUsername = formData
    .get("instagram_username")
    ?.toString()
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const nome = formData.get("nome")?.toString().trim() || null;

  if (!accountId) {
    return NextResponse.redirect(new URL(`/contas`, request.url));
  }

  if (!instagramUsername) {
    return NextResponse.redirect(
      new URL(
        `/contas/${accountId}/ignorados?erro=${encodeURIComponent("Precisa preencher o @usuário.")}`,
        request.url
      )
    );
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_ignorados").insert({
    account_id: accountId,
    instagram_username: instagramUsername,
    nome,
  });

  if (error) {
    console.error("Falha ao salvar @usuário ignorado:", error);
    const mensagem =
      (error as any).code === "23505"
        ? "Esse @usuário já está na lista de ignorados."
        : error.message;
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/ignorados?erro=${encodeURIComponent(mensagem)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/ignorados`, request.url));
}
