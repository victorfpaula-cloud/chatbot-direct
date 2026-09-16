// Datas em horário de São Paulo — usado tanto pela tela de reservas (PainelDeReservas.tsx) quanto
// pela rota de histórico sob demanda (/api/reservas/historico), daí morar num lugar só em vez de
// duplicado nos dois arquivos.

export function hojeEmSaoPauloISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(data);
}

// "Agora", formatado em DD/MM/AAAA HH:MM de São Paulo — usado no aviso por e-mail de reclamação
// (ver enviarEmailDeReclamacao, em email.ts). Mesmo formato já usado na tela de Atendimentos.
export function agoraFormatadoEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

/** A que dia civil de São Paulo um instante (timestamptz) pertence — usado pra agrupar
 * atendimentos por dia (ver /contas/[id]/atendimentos). */
export function dataEmSaoPauloISO(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Início (inclusive) e fim (exclusivo) de um dia civil de São Paulo, como instantes UTC —
 * `dataISO` já é a data em termos de São Paulo (YYYY-MM-DD), não de UTC. Brasil não tem mais
 * horário de verão desde 2019, então São Paulo é sempre UTC-3 fixo (meia-noite em SP = 03:00
 * UTC), sem precisar de biblioteca de fuso horário pra isso — mesmo raciocínio já usado em
 * inicioDoDiaEmSaoPauloISO (src/app/contas/page.tsx), só generalizado pra qualquer dia, não só
 * hoje. */
export function limitesDoDiaEmSaoPauloISO(dataISO: string): { inicio: string; fim: string } {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const inicio = new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0));
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

/** Segunda-feira (YYYY-MM-DD) da semana CIVIL COMPLETA mais recente que já terminou, em termos de
 * São Paulo — usada pelo relatório semanal (ver relatorioSemanal.ts): tanto o envio automático de
 * segunda de manhã quanto o botão "gerar agora" no meio da semana relatam sobre a mesma semana
 * (segunda a domingo) que acabou de passar, nunca a semana em andamento (que ainda não fechou os
 * números). */
export function segundaDaSemanaPassadaEmSaoPauloISO(): string {
  const hoje = hojeEmSaoPauloISO();
  const [ano, mes, dia] = hoje.split("-").map((v) => parseInt(v, 10));
  // getUTCDay: 0 = domingo ... 6 = sábado. Distância até a segunda-feira DESSA semana (a que
  // ainda está em andamento hoje); a semana passada é 7 dias antes dessa.
  const diaDaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  const deltaParaSegundaDestaSemana = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
  return somarDiasISO(hoje, deltaParaSegundaDestaSemana - 7);
}

/** Início (inclusive) e fim (exclusivo) de uma semana civil de São Paulo (segunda a domingo),
 * como instantes UTC — `segundaISO` é a segunda-feira dessa semana. */
export function limitesDaSemanaEmSaoPauloISO(segundaISO: string): { inicio: string; fim: string } {
  const domingoISO = somarDiasISO(segundaISO, 6);
  return {
    inicio: limitesDoDiaEmSaoPauloISO(segundaISO).inicio,
    fim: limitesDoDiaEmSaoPauloISO(domingoISO).fim,
  };
}
