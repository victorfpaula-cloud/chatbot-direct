import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  buscarConfig,
  cabeNoLimite,
  formatarHoraMinuto,
  janelaDoDiaDaSemana,
  limiteMaximoDoPeriodo,
  minutosDoDia,
  parseHorarioLivre,
  somaPessoasReservadas,
  type JanelaHorarioDoDia,
} from "@/lib/reservas";
import { buscarContaPorSlug, hojeISO, montarConfigPublica } from "@/lib/reservaExterna";

/**
 * Checagem "ao vivo" de capacidade pra uma data+período+quantidade específicos — chamada quando a
 * pessoa escolhe a quantidade de pessoas, ANTES de deixar ela preencher WhatsApp e confirmar (a
 * mesma dupla checagem que o fluxo do Instagram faz: uma aqui, suave, e outra final na hora de
 * gravar de verdade — ver `prepararConfirmacaoDeReserva` em src/lib/reservas.ts).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const corpo = await request.json().catch(() => null);

  const data = typeof corpo?.data === "string" ? corpo.data : null;
  const periodoBruto = typeof corpo?.periodo === "string" ? corpo.periodo : null;
  const pessoas = Number(corpo?.pessoas);

  if (!data || !periodoBruto || !Number.isFinite(pessoas) || pessoas < 1) {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  const admin = criarClienteAdmin();
  const conta = await buscarContaPorSlug(admin, slug);
  if (!conta) {
    return NextResponse.json({ erro: "conta não encontrada" }, { status: 404 });
  }

  const config = await montarConfigPublica(admin, conta);
  if (!config.aceitaReservas) {
    return NextResponse.json({ permitido: false, mensagem: config.mensagemFechado });
  }
  if (data < hojeISO()) {
    return NextResponse.json({ permitido: false, mensagem: "Essa data já passou." });
  }
  if (data === hojeISO() && config.hojeFechadoPorHorario) {
    return NextResponse.json({ permitido: false, mensagem: "Nossas reservas de hoje já encerraram — escolha outro dia." });
  }
  if (config.datasBloqueadas.includes(data)) {
    return NextResponse.json({ permitido: false, mensagem: "Não temos reservas nessa data." });
  }

  const modoHorarioLivre = config.modo === "horario";

  // Modo "horário livre": periodoBruto chega como o horário digitado (ex: "20h") — valida contra
  // a janela daquele dia da semana ANTES de checar capacidade, mesma regra que o fluxo do
  // Instagram aplica na etapa "horario_livre" (ver src/lib/reservas.ts).
  let periodo = periodoBruto;
  if (modoHorarioLivre) {
    if (periodoBruto !== "almoco" && periodoBruto !== "jantar") {
      const horarioLivre = parseHorarioLivre(periodoBruto);
      if (!horarioLivre) {
        return NextResponse.json({ permitido: false, mensagem: "Não consegui entender esse horário." });
      }
      const janela = janelaDoDiaDaSemana(config.horarios as JanelaHorarioDoDia[], data);
      if (!janela) {
        return NextResponse.json({ permitido: false, mensagem: "Não estamos aceitando reserva nesse dia." });
      }
      const minutosPedidos = horarioLivre.h * 60 + horarioLivre.m;
      if (minutosPedidos < minutosDoDia(janela.inicio) || minutosPedidos > minutosDoDia(janela.fim)) {
        return NextResponse.json({
          permitido: false,
          mensagem: `Nosso horário pra esse dia é de ${janela.inicio} até ${janela.fim}.`,
        });
      }
      periodo = formatarHoraMinuto(horarioLivre.h, horarioLivre.m);
    }
  } else if (periodoBruto !== "almoco" && periodoBruto !== "jantar") {
    return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });
  }

  const { data: configCompleto } = await buscarConfig(admin, conta.id);
  const limiteMaximo = limiteMaximoDoPeriodo(configCompleto, modoHorarioLivre ? undefined : periodo);

  if (typeof limiteMaximo === "number") {
    const jaReservado = await somaPessoasReservadas(admin, conta.id, data, modoHorarioLivre ? null : periodo);
    if (!cabeNoLimite(jaReservado, pessoas, limiteMaximo)) {
      const mensagem =
        configCompleto?.reserva_mensagem_limite_maximo?.trim() ||
        "Nossas reservas do dia já estão encerradas porque todas as mesas já foram preenchidas. Nosso atendimento será apenas por ordem de chegada.";
      return NextResponse.json({ permitido: false, mensagem });
    }
  }

  return NextResponse.json({ permitido: true });
}
