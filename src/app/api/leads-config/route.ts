import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const IDS_DE_PERGUNTA_VALIDOS = ["interesse", "tipo", "regiao", "preco", "quartos"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();

  if (!accountId) {
    return NextResponse.redirect(new URL(`/contas`, request.url));
  }

  const palavraChaveLead = formData.get("palavra_chave_lead")?.toString() ?? "";

  // Checkboxes (ver leads/PerguntasAtivasEditor.tsx) — só os marcados chegam no formData, por isso
  // getAll em vez de ler campo por campo.
  const perguntasAtivas = formData
    .getAll("leads_pergunta")
    .map((v) => v.toString())
    .filter((v) => IDS_DE_PERGUNTA_VALIDOS.includes(v));

  // Mesmo padrão de reserva_admin_whatsapp (ver reserva-config/route.ts) — um ou mais inputs com
  // o mesmo name, juntados com vírgula.
  const leadsAdminWhatsapp = formData
    .getAll("leads_admin_whatsapp")
    .map((v) => v.toString().trim())
    .filter(Boolean)
    .join(", ");

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      palavra_chave_lead: palavraChaveLead || null,
      leads_perguntas_ativas: perguntasAtivas,
      leads_admin_whatsapp: leadsAdminWhatsapp || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao salvar configuração de leads:", error);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/leads?erro=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/leads?salvo=1`, request.url));
}
