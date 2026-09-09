import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";
import { hojeEmSaoPauloISO, somarDiasISO } from "@/lib/datas";

/**
 * Histórico dos últimos 14 dias + total geral de sempre — usado pelo bloco "Histórico e total de
 * reservas" da tela /reservas (HistoricoSobDemanda.tsx). Antes essas duas consultas rodavam em
 * TODA abertura da tela "Hoje", mesmo pra quem nunca abre esse bloco; agora só busca quando a
 * pessoa realmente abre o dropdown — é informação "bom saber", não essencial pra ver as reservas
 * do dia.
 *
 * O total é ACUMULADO DESDE SEMPRE (não por ano): soma toda reserva já confirmada nesse sistema
 * mais um "ponto de partida" opcional por conta (`reserva_offset_historico_*` em
 * chatbot_account_settings) pra contas que já tinham reservas registradas num sistema antigo,
 * antes desse aqui existir. O cache usa `ano = 0` como uma chave fixa (não é um ano de verdade) só
 * pra reaproveitar a mesma tabela/lógica de "recalcula só uma vez por dia".
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

  const hoje = hojeEmSaoPauloISO();
  const inicioHistorico = somarDiasISO(hoje, -13);

  // As buscas abaixo não dependem uma da outra — rodam ao mesmo tempo.
  const [{ data: historicoRaw }, { data: totalCacheado }, { data: config }] = await Promise.all([
    admin
      .from("chatbot_reservations")
      .select("data_reserva")
      .eq("account_id", contaId)
      .gte("data_reserva", inicioHistorico)
      .lte("data_reserva", hoje),
    admin
      .from("chatbot_reservas_totais_anuais")
      .select("total_reservas, total_pessoas, atualizado_em")
      .eq("account_id", contaId)
      .eq("ano", CHAVE_DO_CACHE_ACUMULADO)
      .maybeSingle(),
    admin
      .from("chatbot_account_settings")
      .select("reserva_offset_historico_reservas, reserva_offset_historico_pessoas")
      .eq("account_id", contaId)
      .maybeSingle(),
  ]);

  const contagemPorDia = new Map<string, number>();
  for (const linha of historicoRaw ?? []) {
    contagemPorDia.set(linha.data_reserva, (contagemPorDia.get(linha.data_reserva) ?? 0) + 1);
  }
  const historico: { data: string; total: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const dia = somarDiasISO(inicioHistorico, i);
    historico.push({ data: dia, total: contagemPorDia.get(dia) ?? 0 });
  }

  const offsetReservas = config?.reserva_offset_historico_reservas ?? 0;
  const offsetPessoas = config?.reserva_offset_historico_pessoas ?? 0;

  // Total acumulado vem de um cache que só recalcula na primeira visita do dia (ver comentário
  // original em PainelDeReservas.tsx) — some tudo de novo só quando o cache não existe ainda ou é
  // de um dia anterior.
  let totalDeReservasNoAno: number;
  let totalDePessoasNoAno: number;
  if (totalCacheado && totalCacheado.atualizado_em === hoje) {
    totalDeReservasNoAno = totalCacheado.total_reservas;
    totalDePessoasNoAno = totalCacheado.total_pessoas;
  } else {
    const { data: todasAsReservas } = await admin
      .from("chatbot_reservations")
      .select("quantidade_pessoas")
      .eq("account_id", contaId);
    totalDeReservasNoAno = offsetReservas + (todasAsReservas?.length ?? 0);
    totalDePessoasNoAno =
      offsetPessoas + (todasAsReservas ?? []).reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);

    await admin.from("chatbot_reservas_totais_anuais").upsert(
      {
        account_id: contaId,
        ano: CHAVE_DO_CACHE_ACUMULADO,
        total_reservas: totalDeReservasNoAno,
        total_pessoas: totalDePessoasNoAno,
        atualizado_em: hoje,
      },
      { onConflict: "account_id,ano" }
    );
  }

  return NextResponse.json({ historico, totalDeReservasNoAno, totalDePessoasNoAno });
}
