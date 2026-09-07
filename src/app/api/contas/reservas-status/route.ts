import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Liga/desliga a função de reservas de uma conta (botão "Ativar/desativar reservas" na tela de
// contas). Diferente da "Pausar reservas temporariamente" (que já existia dentro da própria
// configuração de reserva, e só troca a mensagem que o cliente recebe), isso aqui é o interruptor
// geral: desligado, a conta nem mostra a aba de configuração de reserva preenchida, nem aparece
// no dropdown de contas em /reservas, e o webhook nunca entra no fluxo (ver src/lib/reservas.ts).
//
// Usa `upsert` (não `update`) porque uma conta recém-conectada pode ainda não ter linha em
// chatbot_account_settings — a primeira vez que alguém liga reservas por aqui já cria a linha,
// com o resto dos campos caindo nos defaults da tabela até o Victor preencher a configuração.
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
      reserva_habilitada: habilitar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao ativar/desativar reservas:", error);
    return NextResponse.redirect(new URL(`${voltarPara}?erro=falha_ao_ativar_reservas`, request.url));
  }

  return NextResponse.redirect(new URL(voltarPara, request.url));
}
