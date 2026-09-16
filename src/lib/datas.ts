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

/** Início e fim (YYYY-MM-DD, os dois em termos de São Paulo, os dois INCLUSIVOS) dos últimos
 * `dias` dias, terminando HOJE — usada pelo seletor de período (7/15/30 dias) na tela de
 * relatórios e pelo botão "gerar agora": faz sentido incluir o que já aconteceu hoje até o
 * momento em que a pessoa está olhando. */
export function ultimosDiasEmSaoPauloISO(dias: number): { inicioISO: string; fimISO: string } {
  const fimISO = hojeEmSaoPauloISO();
  return { inicioISO: somarDiasISO(fimISO, -(dias - 1)), fimISO };
}

/** Mesma ideia, mas terminando ONTEM — hoje ainda não fechou, então nunca teria os números
 * completos. Usada pelo envio automático de segunda de manhã (relata os últimos 7 dias já
 * fechados, ou seja a semana que acabou de passar). */
export function ultimosDiasTerminandoOntemEmSaoPauloISO(dias: number): { inicioISO: string; fimISO: string } {
  const fimISO = somarDiasISO(hojeEmSaoPauloISO(), -1);
  return { inicioISO: somarDiasISO(fimISO, -(dias - 1)), fimISO };
}

/** Início (inclusive) e fim (exclusivo) de um período de dias civis de São Paulo, como instantes
 * UTC — `inicioISO`/`fimISO` são os dois extremos do período (os dois INCLUSIVOS, em termos de
 * São Paulo). */
export function limitesDoPeriodoEmSaoPauloISO(inicioISO: string, fimISO: string): { inicio: string; fim: string } {
  return {
    inicio: limitesDoDiaEmSaoPauloISO(inicioISO).inicio,
    fim: limitesDoDiaEmSaoPauloISO(fimISO).fim,
  };
}
