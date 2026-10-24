import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  formatarHoraMinuto,
  janelaDoDiaDaSemana,
  minutosDoDia,
  parseHorarioLivre,
  prepararConfirmacaoDeReserva,
  sincronizarComPlanilha,
  type JanelaHorarioDoDia,
} from "@/lib/reservas";
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
  const periodoBruto = typeof corpo?.periodo === "string" ? corpo.periodo : null;
  const pessoas = Number(corpo?.pessoas);

  if (!nome || nome.length < 2 || whatsapp.replace(/\D/g, "").length < 8 || !data || !periodoBruto || !Number.isFinite(pessoas) || pessoas < 1) {
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

  // Modo "horário livre": periodoBruto chega como o horário digitado (ex: "20h") — mesma validação
  // de janela que a etapa "horario_livre" do Instagram aplica (ver src/lib/reservas.ts), repetida
  // aqui porque esse é o ÚLTIMO ponto antes de gravar (quem chamou /disponibilidade pode ter
  // levado minutos até confirmar, e a janela nunca deveria ser confiada só no que o cliente mandou).
  let periodo = periodoBruto;
  if (config.modo === "horario") {
    if (periodoBruto !== "almoco" && periodoBruto !== "jantar") {
      const horarioLivre = parseHorarioLivre(periodoBruto);
      if (!horarioLivre) {
        return NextResponse.json({ ok: false, mensagem: "Não consegui entender esse horário." });
      }
      const janela = janelaDoDiaDaSemana(config.horarios as JanelaHorarioDoDia[], data);
      if (!janela) {
        return NextResponse.json({ ok: false, mensagem: "Não estamos aceitando reserva nesse dia." });
      }
      const minutosPedidos = horarioLivre.h * 60 + horarioLivre.m;
      if (minutosPedidos < minutosDoDia(janela.inicio) || minutosPedidos > minutosDoDia(janela.fim)) {
        return NextResponse.json({
          ok: false,
          mensagem: `Nosso horário pra esse dia é de ${janela.inicio} até ${janela.fim}.`,
        });
      }
      periodo = formatarHoraMinuto(horarioLivre.h, horarioLivre.m);
    }
  } else if (periodoBruto !== "almoco" && periodoBruto !== "jantar") {
    return NextResponse.json({ ok: false, mensagem: "Dados inválidos." }, { status: 400 });
  }

  const dados = {
    nome,
    username: null,
    // Nunca null: reserva feita por aqui não tem NENHUMA conversa por trás (sem Direct, sem
    // SendPulse) pra gerar um id de verdade, mas um id sintético (mesma ideia de "manual:...")
    // evita qualquer código que assuma instagram_scoped_id sempre preenchido — foi exatamente um
    // id nulo aqui que derrubou a tela de reservas do funcionário em produção (18/09/2026, ver
    // PainelDeReservas.tsx: ".startsWith" chamado direto num id nulo).
    instagram_scoped_id: `externo:${crypto.randomUUID()}`,
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
