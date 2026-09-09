import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";
import { hojeEmSaoPauloISO } from "@/lib/datas";

/**
 * Total geral de reservas/pessoas ACUMULADO DESDE SEMPRE — usado pelo bloco "Histórico e total de
 * reservas" da tela /reservas (HistoricoSobDemanda.tsx). Só busca quando a pessoa realmente abre o
 * dropdown — é informação "bom saber", não essencial pra ver as reservas do dia.
 *
 * Só LÊ o contador (`chatbot_reservas_totais_anuais`, `ano = 0` como chave fixa — não é um ano de
 * verdade) — nunca soma a tabela `chatbot_reservations` inteira. Quem mantém esse contador
 * atualizado é `ajustarTotalAcumulado` em src/lib/reservas.ts, chamada a cada reserva confirmada
 * (e a cada alteração de quantidade numa reserva já existente), não um recálculo periódico. Se o
 * contador ainda não existe pra essa conta (primeiro acesso), semeia com o "ponto de partida"
 * configurado (`reserva_offset_historico_*` em chatbot_account_settings, zero por padrão) — sem
 * nunca escanear `chatbot_reservations`.
 */
export const dynamic = "force-dynamic";

const CHAVE_DO_CACHE_ACUMULADO = 0;

export async function GET(request: NextRequest) {
  const admin = criarClienteAdmin();
  const autorInfo = await resolverAutorDaAcao(request, admin);
  if (!autorInfo) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contaId = autorInfo.tipo === "funcionario" ? autorInfo.contaId : searchParams.get("conta");
  if (!contaId) {
    return NextResponse.json({ erro: "conta não informada" }, { status: 400 });
  }

  const { data: totalCacheado } = await admin
    .from("chatbot_reservas_totais_anuais")
    .select("total_reservas, total_pessoas")
    .eq("account_id", contaId)
    .eq("ano", CHAVE_DO_CACHE_ACUMULADO)
    .maybeSingle();

  let totalDeReservasNoAno: number;
  let totalDePessoasNoAno: number;

  if (totalCacheado) {
    totalDeReservasNoAno = totalCacheado.total_reservas;
    totalDePessoasNoAno = totalCacheado.total_pessoas;
  } else {
    // Primeiro acesso dessa conta — semeia o contador com o ponto de partida configurado (zero se
    // a conta não tiver histórico de um sistema antigo pra declarar).
    const { data: config } = await admin
      .from("chatbot_account_settings")
      .select("reserva_offset_historico_reservas, reserva_offset_historico_pessoas")
      .eq("account_id", contaId)
      .maybeSingle();

    totalDeReservasNoAno = config?.reserva_offset_historico_reservas ?? 0;
    totalDePessoasNoAno = config?.reserva_offset_historico_pessoas ?? 0;

    await admin.from("chatbot_reservas_totais_anuais").upsert(
      {
        account_id: contaId,
        ano: CHAVE_DO_CACHE_ACUMULADO,
        total_reservas: totalDeReservasNoAno,
        total_pessoas: totalDePessoasNoAno,
        atualizado_em: hojeEmSaoPauloISO(),
      },
      { onConflict: "account_id,ano" }
    );
  }

  return NextResponse.json({ totalDeReservasNoAno, totalDePessoasNoAno });
}
