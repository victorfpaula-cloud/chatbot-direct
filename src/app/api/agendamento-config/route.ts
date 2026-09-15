import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { DIAS_DA_SEMANA_PADRAO, type CampoPersonalizado, type HorarioDoDia } from "@/lib/agendamentos";

const INTERVALOS_VALIDOS = [30, 60, 90, 120];

function tentarParsearJSON<T>(texto: string | undefined, valorPadrao: T): T {
  if (!texto) return valorPadrao;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return valorPadrao;
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("account_id")?.toString();

  if (!accountId) {
    return NextResponse.redirect(new URL(`/contas`, request.url));
  }

  const palavraChaveAgendamento = formData.get("palavra_chave_agendamento")?.toString() ?? "";
  const agendamentoRegrasTexto = formData.get("agendamento_regras_texto")?.toString() ?? "";
  const agendamentoMsgInicial = formData.get("agendamento_msg_inicial")?.toString() ?? "";
  const agendamentoMsgConfirmada = formData.get("agendamento_msg_confirmada")?.toString() ?? "";
  const agendamentoMsgRecusada = formData.get("agendamento_msg_recusada")?.toString() ?? "";
  const agendamentoDatasBloqueadas = formData.get("agendamento_datas_bloqueadas")?.toString() ?? "";
  const agendamentoPausaAtiva = formData.get("agendamento_pausa_ativa") === "on";
  const agendamentoPausaMensagem = formData.get("agendamento_pausa_mensagem")?.toString() ?? "";

  const intervaloBruto = Number(formData.get("agendamento_intervalo_minutos")?.toString());
  const agendamentoIntervaloMinutos = INTERVALOS_VALIDOS.includes(intervaloBruto) ? intervaloBruto : 30;

  const vagasBruto = Number(formData.get("agendamento_vagas_por_horario")?.toString());
  const agendamentoVagasPorHorario =
    Number.isFinite(vagasBruto) && vagasBruto > 0 ? Math.floor(vagasBruto) : 1;

  const horarios = tentarParsearJSON<HorarioDoDia[]>(
    formData.get("agendamento_horarios")?.toString(),
    DIAS_DA_SEMANA_PADRAO
  );
  const camposPersonalizados = tentarParsearJSON<CampoPersonalizado[]>(
    formData.get("agendamento_campos_personalizados")?.toString(),
    []
  ).filter((c) => c.pergunta.trim().length > 0);

  const admin = criarClienteAdmin();
  const { error } = await admin.from("chatbot_account_settings").upsert(
    {
      account_id: accountId,
      palavra_chave_agendamento: palavraChaveAgendamento || null,
      agendamento_intervalo_minutos: agendamentoIntervaloMinutos,
      agendamento_vagas_por_horario: agendamentoVagasPorHorario,
      agendamento_horarios: horarios,
      agendamento_datas_bloqueadas: agendamentoDatasBloqueadas || null,
      agendamento_regras_texto: agendamentoRegrasTexto || null,
      agendamento_msg_inicial: agendamentoMsgInicial || null,
      agendamento_msg_confirmada: agendamentoMsgConfirmada || null,
      agendamento_msg_recusada: agendamentoMsgRecusada || null,
      agendamento_pausa_ativa: agendamentoPausaAtiva,
      agendamento_pausa_mensagem: agendamentoPausaMensagem || null,
      agendamento_campos_personalizados: camposPersonalizados,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );

  if (error) {
    console.error("Falha ao salvar configuração de agendamento:", error);
    return NextResponse.redirect(
      new URL(`/contas/${accountId}/agendamento?erro=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/contas/${accountId}/agendamento?salvo=1`, request.url));
}
