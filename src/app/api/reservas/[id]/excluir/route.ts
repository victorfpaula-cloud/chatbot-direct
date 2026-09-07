import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";

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
    .select("id, account_id, cliente_nome, data_reserva, periodo, quantidade_pessoas")
    .eq("id", params.id)
    .maybeSingle();

  // Funcionário só pode mexer em reserva da própria conta — mesmo que tente submeter um id de
  // reserva de outra conta na mão, essa checagem barra aqui.
  if (!reserva || (autorInfo.tipo === "funcionario" && autorInfo.contaId !== reserva.account_id)) {
    return NextResponse.redirect(new URL(redirectPara, request.url));
  }

  const { error } = await admin.from("chatbot_reservations").delete().eq("id", params.id);

  if (!error) {
    const rotuloDoPeriodo = reserva.periodo === "almoco" ? "almoço" : reserva.periodo === "jantar" ? "jantar" : "sem período";
    await admin.from("chatbot_reservas_log").insert({
      account_id: reserva.account_id,
      reserva_id: reserva.id,
      cliente_nome: reserva.cliente_nome,
      autor: autorInfo.autor,
      acao: "excluido",
      detalhe: `Reserva excluída — ${reserva.data_reserva}, ${rotuloDoPeriodo}, ${reserva.quantidade_pessoas} pessoa(s)`,
    });
  }

  return NextResponse.redirect(new URL(redirectPara, request.url));
}
