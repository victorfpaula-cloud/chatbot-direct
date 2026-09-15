import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { prepararConfirmacaoDeReserva, sincronizarComPlanilha } from "@/lib/reservas";
import { buscarContaPorSlug, hojeISO, montarConfigPublica } from "@/lib/reservaExterna";

function paraDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Grava a reserva de verdade — mesma checagem de capacidade e mesma tabela (chatbot_reservations)
 * do fluxo do Instagram, via `prepararConfirmacaoDeReserva` (src/lib/reservas.ts). Sem token de
 * acesso à Meta aqui (não existe DM pra mandar), então a resposta pro cliente é só o texto —
 * quem exibe é a própria página.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const corpo = await request.json().catch(() => null);

  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const whatsapp = typeof corpo?.whatsapp === "string" ? corpo.whatsapp.trim() : "";
  const data = typeof corpo?.data === "string" ? corpo.data : "";
  const periodo = corpo?.periodo === "almoco" || corpo?.periodo === "jantar" ? corpo.periodo : null;
  const pessoas = Number(corpo?.pessoas);

  if (!nome || nome.length < 2 || whatsapp.replace(/\D/g, "").length < 8 || !data || !periodo || !Number.isFinite(pessoas) || pessoas < 1) {
    return NextResponse.json({ ok: false, mensagem: "Dados inválidos." }, { status: 400 });
  }

  const admin = criarClienteAdmin();
  const conta = await buscarContaPorSlug(admin, slug);
  if (!conta) {
    return NextResponse.json({ ok: false, mensagem: "Conta não encontrada." }, { status: 404 });
  }

  const config = await montarConfigPublica(admin, conta);
  if (!config.aceitaReservas) {
    return NextResponse.json({ ok: false, mensagem: config.mensagemFechado });
  }
  if (data < hojeISO() || (data === hojeISO() && config.hojeFechadoPorHorario) || config.datasBloqueadas.includes(data)) {
    return NextResponse.json({ ok: false, mensagem: "Essa data não está mais disponível — escolha outra." });
  }

  const dados = {
    nome,
    username: null,
    instagram_scoped_id: null,
    data_reserva: data,
    data_reserva_br: paraDataBR(data),
    periodo,
    quantidade_pessoas: pessoas,
    whatsapp,
  };

  const resultado = await prepararConfirmacaoDeReserva(admin, conta.id, dados);

  if (resultado.ok && resultado.reservaId) {
    await sincronizarComPlanilha(admin, resultado.config, resultado.reservaId, dados);
  }

  return NextResponse.json({ ok: resultado.ok, mensagem: resultado.mensagem });
}
