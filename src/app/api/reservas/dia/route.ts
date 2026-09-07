import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { resolverAutorDaAcao } from "@/lib/reservasAutor";

/**
 * Reservas completas de um único dia — usada pelas telas Antigas/Futuras (DiaComCarregamentoSobDemanda.tsx)
 * pra carregar os dados de um dia só quando a pessoa realmente abre o dropdown daquele dia, em vez
 * de a página inteira já vir com todo o intervalo (30 dias antigos ou todas as reservas futuras)
 * carregado de cara.
 */
export async function GET(request: NextRequest) {
  const admin = criarClienteAdmin();
  const autorInfo = await resolverAutorDaAcao(request, admin);
  if (!autorInfo) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "data inválida" }, { status: 400 });
  }

  // Funcionário só enxerga a própria conta, mesmo que tente passar outra no parâmetro — igual à
  // mesma checagem já feita nas rotas de editar/excluir reserva.
  const contaId = autorInfo.tipo === "funcionario" ? autorInfo.contaId : searchParams.get("conta");
  if (!contaId) {
    return NextResponse.json({ erro: "conta não informada" }, { status: 400 });
  }

  const periodo = searchParams.get("periodo") ?? "todos";
  const busca = searchParams.get("busca")?.trim() ?? "";

  let consulta = admin
    .from("chatbot_reservations")
    .select(
      "id, instagram_scoped_id, cliente_nome, cliente_instagram_username, data_reserva, periodo, quantidade_pessoas, whatsapp, confirmado_em"
    )
    .eq("account_id", contaId)
    .eq("data_reserva", data)
    .order("periodo", { ascending: true })
    .order("confirmado_em", { ascending: true });

  if (periodo !== "todos") {
    consulta = consulta.eq("periodo", periodo);
  }
  if (busca) {
    // Mesmo cuidado da tela: vírgula/parênteses quebram o `.or()` do PostgREST.
    const buscaSegura = busca.replace(/[,()]/g, "");
    if (buscaSegura) {
      consulta = consulta.or(
        `cliente_nome.ilike.%${buscaSegura}%,cliente_instagram_username.ilike.%${buscaSegura}%`
      );
    }
  }

  const { data: reservas, error } = await consulta;
  if (error) {
    return NextResponse.json({ erro: "falha ao buscar reservas" }, { status: 500 });
  }

  return NextResponse.json({ reservas: reservas ?? [] });
}
