import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = criarClienteAdmin();
  const formData = await request.formData();
  const redirectPara = formData.get("redirect_to")?.toString() || "/reservas";
  const novaQuantidade = parseInt(formData.get("quantidade_pessoas")?.toString() ?? "", 10);
  const novoNome = formData.get("cliente_nome")?.toString().trim() ?? "";

  const autorInfo = await resolverAutorDaAcao(request, admin);
  if (!autorInfo || !Number.isFinite(novaQuantidade) || novaQuantidade <= 0 || !novoNome) {
    return NextResponse.redirect(new URL(redirectPara, request.url));
  }

  const { data: reserva } = await admin
    .from("chatbot_reservations")
    .select("id, account_id, cliente_nome, quantidade_pessoas")
    .eq("id", params.id)
    .maybeSingle();

  // Funcionário só pode mexer em reserva da própria conta — mesmo que tente submeter um id de
  // reserva de outra conta na mão, essa checagem barra aqui.
  if (!reserva || (autorInfo.tipo === "funcionario" && autorInfo.contaId !== reserva.account_id)) {
    return NextResponse.redirect(new URL(redirectPara, request.url));
  }

  const quantidadeAntiga = reserva.quantidade_pessoas;
  const nomeAntigo = reserva.cliente_nome;

  const { error } = await admin
    .from("chatbot_reservations")
    .update({ quantidade_pessoas: novaQuantidade, cliente_nome: novoNome })
    .eq("id", params.id);

  if (!error) {
    const mudancas: string[] = [];
    if (nomeAntigo !== novoNome) mudancas.push(`nome alterado de "${nomeAntigo}" para "${novoNome}"`);
    if (quantidadeAntiga !== novaQuantidade) mudancas.push(`quantidade de pessoas alterada de ${quantidadeAntiga} para ${novaQuantidade}`);

    await admin.from("chatbot_reservas_log").insert({
      account_id: reserva.account_id,
      reserva_id: reserva.id,
      cliente_nome: novoNome,
      autor: autorInfo.autor,
      acao: "editado",
      detalhe: mudancas.length > 0 ? mudancas.join("; ") : "nenhuma alteração",
    });
  }

  return NextResponse.redirect(new URL(redirectPara, request.url));
}
