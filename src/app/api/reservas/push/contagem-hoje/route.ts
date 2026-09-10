import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";
import { hojeEmSaoPauloISO } from "@/lib/datas";

/**
 * Quantas reservas existem hoje pra essa conta — usada só pra atualizar o numerozinho no ícone
 * (ver NotificacoesPush.tsx) toda vez que o app é aberto, além do que a notificação push já
 * atualiza sozinha em tempo real. Cobre o caso de o aparelho ter ficado sem receber alguma
 * notificação (rede caiu, etc.) ou o app ter ficado fechado o dia inteiro.
 */
export const dynamic = "force-dynamic";

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

  const { count, error } = await admin
    .from("chatbot_reservations")
    .select("id", { count: "exact", head: true })
    .eq("account_id", contaId)
    .eq("data_reserva", hojeEmSaoPauloISO());

  if (error) {
    console.error("Falha ao contar reservas de hoje pro badge:", error);
    return NextResponse.json({ erro: "falha ao contar" }, { status: 500 });
  }

  return NextResponse.json({ total: count ?? 0 });
}
