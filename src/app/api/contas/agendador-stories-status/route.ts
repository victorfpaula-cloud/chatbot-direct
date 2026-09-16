import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Liga/desliga o serviço "Agendador de Stories" de uma conta — mesmo espírito de
 * /api/contas/busca-status (ver comentários lá), com um passo a mais: além de marcar o flag aqui
 * no chatbot-direct, também espelha `accounts.is_active` (tabela do Agendador de Stories, app
 * separado mas que vive no MESMO projeto Supabase — sem isso, desligar aqui só escondia a aba, mas
 * o motor de publicação de lá continuava postando Stories sozinho.
 *
 * A sincronização é best-effort: se essa conta ainda não tiver sido conectada lá (nenhuma linha em
 * `accounts` com esse instagram_user_id), a chavinha continua funcionando normalmente aqui — só não
 * tem o que espelhar ainda.
 */
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
      agendador_stories_habilitado: habilitar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao ativar/desativar Agendador de Stories:", error);
    return NextResponse.redirect(new URL(`${voltarPara}?erro=falha_ao_ativar_stories`, request.url));
  }

  const { data: conta } = await admin
    .from("chatbot_accounts")
    .select("instagram_user_id")
    .eq("id", accountId)
    .maybeSingle();

  if (conta?.instagram_user_id) {
    const { error: erroStories } = await admin
      .from("accounts")
      .update({ is_active: habilitar })
      .eq("ig_user_id", conta.instagram_user_id);

    if (erroStories) {
      console.error("Falha ao sincronizar status com o Agendador de Stories:", erroStories);
    }
  }

  return NextResponse.redirect(new URL(voltarPara, request.url));
}
