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
