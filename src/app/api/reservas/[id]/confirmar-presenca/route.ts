import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";

/** Alterna presenca_confirmada (não recebe o valor desejado do cliente — sempre inverte o que já
 * está gravado) — clicar em "Confirmar" liga, clicar de novo em "Chegou" desliga, sem precisar de
 * dois botões/rotas diferentes nem de sincronizar estado entre cliente e servidor. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = criarClienteAdmin();
  const formData = await request.formData();
  const redirectPara = formData.get("redirect_to")?.toString() || "/reservas";

  const autorInfo = await resolverAutorDaAcao(request, admin);
  if (!autorInfo) {
    return NextResponse.redirect(new URL(redirectPara, request.url));
  }

  const { data: reserva } = await admin
    .from("chatbot_reservations")
    .select("id, account_id, cliente_nome, presenca_confirmada")
    .eq("id", params.id)
    .maybeSingle();

  // Funcionário só pode mexer em reserva da própria conta — mesma checagem já feita nas rotas de
  // editar/excluir reserva.
  if (!reserva || (autorInfo.tipo === "funcionario" && autorInfo.contaId !== reserva.account_id)) {
    return NextResponse.redirect(new URL(redirectPara, request.url));
  }

  const novoValor = !reserva.presenca_confirmada;

  const { error } = await admin
    .from("chatbot_reservations")
    .update({ presenca_confirmada: novoValor })
    .eq("id", params.id);

  if (!error) {
    await admin.from("chatbot_reservas_log").insert({
      account_id: reserva.account_id,
      reserva_id: reserva.id,
      cliente_nome: reserva.cliente_nome,
      autor: autorInfo.autor,
      acao: novoValor ? "presença confirmada" : "presença desfeita",
      detalhe: novoValor ? "Cliente marcado como já chegou" : "Marcação de chegada desfeita",
    });
  }

  return NextResponse.redirect(new URL(redirectPara, request.url));
}
