import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { normalizarSlug } from "@/lib/slug";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();

  if (!accountId) {
    return NextResponse.redirect(new URL(`/contas`, request.url));
  }

  const palavraChaveReserva = formData.get("palavra_chave_reserva")?.toString() ?? "";
  const reservaRegrasTexto = formData.get("reserva_regras_texto")?.toString() ?? "";
  const reservaMensagemLimiteMaximo =
    formData.get("reserva_mensagem_limite_maximo")?.toString() ?? "";
  const reservaCutoffHorario = formData.get("reserva_cutoff_horario")?.toString() ?? "";
  const reservaPausaAtiva = formData.get("reserva_pausa_ativa") === "on";
  const reservaPausaData = formData.get("reserva_pausa_data")?.toString() ?? "";
  const reservaPausaMensagem = formData.get("reserva_pausa_mensagem")?.toString() ?? "";
  const googleSheetId = formData.get("google_sheet_id")?.toString() ?? "";

  const reservaMsgInicial = formData.get("reserva_msg_inicial")?.toString() ?? "";
  const reservaMsgPerguntaData = formData.get("reserva_msg_pergunta_data")?.toString() ?? "";
  const reservaMsgPerguntaPeriodo = formData.get("reserva_msg_pergunta_periodo")?.toString() ?? "";
  const reservaMsgPerguntaPessoas = formData.get("reserva_msg_pergunta_pessoas")?.toString() ?? "";
  const reservaMsgPerguntaWhatsapp = formData.get("reserva_msg_pergunta_whatsapp")?.toString() ?? "";
  const reservaMsgConfirmada = formData.get("reserva_msg_confirmada")?.toString() ?? "";
  const reservaMsgRecusada = formData.get("reserva_msg_recusada")?.toString() ?? "";
  const reservaDatasBloqueadas = formData.get("reserva_datas_bloqueadas")?.toString() ?? "";
  const palavraChaveAlterarReserva = formData.get("palavra_chave_alterar_reserva")?.toString() ?? "";
  const alteracaoCutoffHorario = formData.get("alteracao_cutoff_horario")?.toString() ?? "";

  const reservaLembreteHabilitado = formData.get("reserva_lembrete_habilitado") === "on";
  const reservaLembreteHorario = formData.get("reserva_lembrete_horario")?.toString() ?? "";
  const reservaAdminWhatsapp = formData.get("reserva_admin_whatsapp")?.toString().trim() ?? "";

  const corDestaqueManualBruta = formData.get("cor_destaque_manual")?.toString().trim() ?? "";
  const corDestaqueManual = /^#[0-9a-fA-F]{6}$/.test(corDestaqueManualBruta) ? corDestaqueManualBruta : null;

  const slugBruto = formData.get("slug")?.toString().trim() ?? "";
  const slug = slugBruto ? normalizarSlug(slugBruto) : null;

  const limiteNormalBruto = formData.get("reserva_limite_normal")?.toString().trim();
  const limiteMaximoBruto = formData.get("reserva_limite_maximo")?.toString().trim();
  const limiteMaximoJantarBruto = formData.get("reserva_limite_maximo_jantar")?.toString().trim();

  const reservaLimiteNormal =
    limiteNormalBruto && !Number.isNaN(Number(limiteNormalBruto)) ? Number(limiteNormalBruto) : null;
  const reservaLimiteMaximo =
    limiteMaximoBruto && !Number.isNaN(Number(limiteMaximoBruto)) ? Number(limiteMaximoBruto) : null;
  // Em branco = usa o mesmo número do Almoço (ver limiteMaximoDoPeriodo em src/lib/reservas.ts) —
  // aqui só grava exatamente o que a pessoa digitou, sem null vs. explicitamente igual ao almoço.
  const reservaLimiteMaximoJantar =
    limiteMaximoJantarBruto && !Number.isNaN(Number(limiteMaximoJantarBruto))
      ? Number(limiteMaximoJantarBruto)
      : null;

  const admin = criarClienteAdmin();

  // Cor de destaque e slug (link externo) moram em chatbot_accounts, não em
  // chatbot_account_settings como o resto dos campos dessa tela — atualização separada. slug é a
  // MESMA coluna que a aba Agendamento também escreve (ver /api/agendamento-config) — uma conta,
  // um link só, editável de qualquer uma das duas telas.
  const { error: erroDaConta } = await admin
    .from("chatbot_accounts")
    .update({ cor_destaque_manual: corDestaqueManual, slug })
    .eq("id", accountId);

  if (erroDaConta) {
    // 23505 = unique_violation — outra conta já usa esse mesmo slug.
    const mensagem =
      erroDaConta.code === "23505"
        ? "Esse link já está sendo usado por outra conta — escolha outro."
        : erroDaConta.message;
    console.error("Falha ao salvar cor de destaque/link externo:", erroDaConta);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/reserva?erro=${encodeURIComponent(mensagem)}`, request.url)
    );
  }

  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      palavra_chave_reserva: palavraChaveReserva || null,
      reserva_regras_texto: reservaRegrasTexto || null,
      reserva_limite_normal: reservaLimiteNormal,
      reserva_limite_maximo: reservaLimiteMaximo,
      reserva_limite_maximo_jantar: reservaLimiteMaximoJantar,
      reserva_mensagem_limite_maximo: reservaMensagemLimiteMaximo || null,
      reserva_cutoff_horario: reservaCutoffHorario || null,
      reserva_pausa_ativa: reservaPausaAtiva,
      reserva_pausa_data: reservaPausaData || null,
      reserva_pausa_mensagem: reservaPausaMensagem || null,
      google_sheet_id: googleSheetId || null,
      reserva_msg_inicial: reservaMsgInicial || null,
      reserva_msg_pergunta_data: reservaMsgPerguntaData || null,
      reserva_msg_pergunta_periodo: reservaMsgPerguntaPeriodo || null,
      reserva_msg_pergunta_pessoas: reservaMsgPerguntaPessoas || null,
      reserva_msg_pergunta_whatsapp: reservaMsgPerguntaWhatsapp || null,
      reserva_msg_confirmada: reservaMsgConfirmada || null,
      reserva_msg_recusada: reservaMsgRecusada || null,
      reserva_datas_bloqueadas: reservaDatasBloqueadas || null,
      palavra_chave_alterar_reserva: palavraChaveAlterarReserva || null,
      alteracao_cutoff_horario: alteracaoCutoffHorario || null,
      reserva_lembrete_habilitado: reservaLembreteHabilitado,
      // Coluna NOT NULL no banco (sempre precisa de um horário pra comparar no cron) — nunca grava
      // null aqui, mesmo que o campo chegue vazio por algum motivo.
      reserva_lembrete_horario: reservaLembreteHorario || "18:40",
      reserva_admin_whatsapp: reservaAdminWhatsapp || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao salvar configuração de reserva:", error);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/reserva?erro=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/reserva?salvo=1`, request.url));
}
