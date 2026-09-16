import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteAgendadorStories } from "@/lib/supabase/agendadorStories";

/**
 * Liga/desliga o serviço "Agendador de Stories" de uma conta — mesmo espírito de
 * /api/contas/busca-status (ver comentários lá), com um passo a mais: além de marcar o flag aqui
 * no chatbot-direct, também espelha pro OUTRO projeto (agendador-stories), atualizando
 * `accounts.is_active` por lá — sem isso, desligar aqui só escondia a aba, mas o motor de
 * publicação de lá continuava postando Stories sozinho.
 *
 * A sincronização com o outro banco é best-effort: se a integração ainda não estiver configurada
 * (faltam as variáveis de ambiente) ou essa conta ainda não tiver sido conectada lá, a chavinha
 * continua funcionando normalmente aqui — só não tem o que espelhar do outro lado ainda.
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

  const clienteRemoto = criarClienteAgendadorStories();
  if (clienteRemoto) {
    const { data: conta } = await admin
      .from("chatbot_accounts")
      .select("instagram_user_id")
      .eq("id", accountId)
      .maybeSingle();

    if (conta?.instagram_user_id) {
      const { error: erroRemoto } = await clienteRemoto
        .from("accounts")
        .update({ is_active: habilitar })
        .eq("ig_user_id", conta.instagram_user_id);

      if (erroRemoto) {
        console.error("Falha ao sincronizar status com o Agendador de Stories:", erroRemoto);
      }
    }
  }

  return NextResponse.redirect(new URL(voltarPara, request.url));
}
