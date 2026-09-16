import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { limitesDoDiaEmSaoPauloISO } from "@/lib/datas";

/**
 * Atendimentos completos de um único dia — usada pela tela de Atendimentos (ver
 * DiaDeAtendimentosSobDemanda.tsx) pra carregar mensagem/resposta/erro só quando a pessoa abre o
 * dropdown daquele dia, em vez de a página inteira já vir com o histórico todo carregado de cara.
 * Autenticação (sessão de admin) já é exigida pelo middleware pra qualquer rota fora das exceções
 * públicas — essa não precisa checar de novo aqui.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contaId = searchParams.get("conta");
  const data = searchParams.get("data") ?? "";
  const status = searchParams.get("status");

  if (!contaId) {
    return NextResponse.json({ erro: "conta não informada" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "data inválida" }, { status: 400 });
  }

  const { inicio, fim } = limitesDoDiaEmSaoPauloISO(data);

  const admin = criarClienteAdmin();
  let consulta = admin
    .from("chatbot_atendimentos")
    .select(
      "id, instagram_scoped_id, cliente_nome, cliente_username, mensagem_recebida, tipo_resposta, resposta_enviada, status, erro_detalhe, criado_em"
    )
    .eq("account_id", contaId)
    .gte("criado_em", inicio)
    .lt("criado_em", fim)
    .order("criado_em", { ascending: false });

  if (status === "respondido" || status === "erro" || status === "sem_resposta") {
    consulta = consulta.eq("status", status);
  }

  const { data: atendimentos, error } = await consulta;
  if (error) {
    console.error("Falha ao buscar atendimentos do dia:", error);
    return NextResponse.json({ erro: "falha ao buscar atendimentos" }, { status: 500 });
  }

  return NextResponse.json({ atendimentos: atendimentos ?? [] });
}
