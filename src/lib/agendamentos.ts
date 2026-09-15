import type { SupabaseClient } from "@supabase/supabase-js";
import { agoraEmSaoPaulo, paraISO, estaBloqueada, somarDias } from "./reservas";

// Sistema de Agendamento (calendário + blocos de horário, ex: salão de beleza) — totalmente
// separado do sistema de Reserva (src/lib/reservas.ts): não lê nem escreve nenhuma tabela/coluna
// de reserva. As únicas coisas reaproveitadas de lá são utilitários puros de data/hora
// (agoraEmSaoPaulo, paraISO, estaBloqueada, somarDias), sem nenhuma dependência no sentido
// contrário — mudar/desligar Agendamento nunca afeta Reserva.

export type CampoPersonalizado = {
  id: string;
  pergunta: string;
  tipo: "texto" | "opcoes";
  opcoes?: string[];
};

export type HorarioDoDia = {
  dia: number; // 0 = domingo ... 6 = sábado, igual ao Date.getDay()
  ativo: boolean;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
};

export const DIAS_DA_SEMANA_PADRAO: HorarioDoDia[] = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
  dia,
  ativo: dia >= 1 && dia <= 5,
  inicio: "09:00",
  fim: "18:00",
}));

export type ConfigAgendamento = {
  habilitado: boolean;
  palavraChave: string | null;
  intervaloMinutos: number;
  vagasPorHorario: number;
  horarios: HorarioDoDia[];
  datasBloqueadasTexto: string | null;
  regrasTexto: string | null;
  msgInicial: string | null;
  msgConfirmada: string | null;
  msgRecusada: string | null;
  pausaAtiva: boolean;
  pausaMensagem: string | null;
  camposPersonalizados: CampoPersonalizado[];
};

const SELECT_CONFIG_AGENDAMENTO =
  "agendamento_habilitado, palavra_chave_agendamento, agendamento_intervalo_minutos, agendamento_vagas_por_horario, agendamento_horarios, agendamento_datas_bloqueadas, agendamento_regras_texto, agendamento_msg_inicial, agendamento_msg_confirmada, agendamento_msg_recusada, agendamento_pausa_ativa, agendamento_pausa_mensagem, agendamento_campos_personalizados";

export async function buscarConfigAgendamento(
  supabase: SupabaseClient,
  accountId: string
): Promise<ConfigAgendamento | null> {
  const { data } = await supabase
    .from("chatbot_account_settings")
    .select(SELECT_CONFIG_AGENDAMENTO)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!data) return null;

  return {
    habilitado: data.agendamento_habilitado ?? false,
    palavraChave: data.palavra_chave_agendamento ?? null,
    intervaloMinutos: data.agendamento_intervalo_minutos ?? 30,
    vagasPorHorario: data.agendamento_vagas_por_horario ?? 1,
    horarios: Array.isArray(data.agendamento_horarios) && data.agendamento_horarios.length > 0
      ? (data.agendamento_horarios as HorarioDoDia[])
      : DIAS_DA_SEMANA_PADRAO,
    datasBloqueadasTexto: data.agendamento_datas_bloqueadas ?? null,
    regrasTexto: data.agendamento_regras_texto ?? null,
    msgInicial: data.agendamento_msg_inicial ?? null,
    msgConfirmada: data.agendamento_msg_confirmada ?? null,
    msgRecusada: data.agendamento_msg_recusada ?? null,
    pausaAtiva: data.agendamento_pausa_ativa ?? false,
    pausaMensagem: data.agendamento_pausa_mensagem ?? null,
    camposPersonalizados: Array.isArray(data.agendamento_campos_personalizados)
      ? (data.agendamento_campos_personalizados as CampoPersonalizado[])
      : [],
  };
}

function minutosDoDia(horaMinuto: string): number {
  const [h, m] = horaMinuto.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function paraHoraMinuto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Todos os blocos de horário do dia (ex: 09:00, 09:30, 10:00, ...) segundo a janela e o intervalo
 * configurados pro dia da semana correspondente — sem checar ocupação/bloqueio ainda (ver
 * `horariosDisponiveis` pra isso). Vazio se o dia da semana estiver desativado. */
export function gerarBlocosDoDia(config: ConfigAgendamento, dataISO: string): string[] {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const diaDaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  const janela = config.horarios.find((h) => h.dia === diaDaSemana);
  if (!janela || !janela.ativo) return [];

  const inicio = minutosDoDia(janela.inicio);
  const fim = minutosDoDia(janela.fim);
  const blocos: string[] = [];
  for (let m = inicio; m + config.intervaloMinutos <= fim; m += config.intervaloMinutos) {
    blocos.push(paraHoraMinuto(m));
  }
  return blocos;
}

/** Blocos do dia que ainda têm vaga — descontando quantos agendamentos já existem em cada horário
 * (contra `agendamento_vagas_por_horario`) e removendo o dia inteiro se estiver bloqueado. */
export function horariosDisponiveis(
  config: ConfigAgendamento,
  dataISO: string,
  agendamentosDoDia: { horario: string }[]
): string[] {
  if (estaBloqueada(dataISO, config.datasBloqueadasTexto)) return [];

  const ocupacaoPorHorario = new Map<string, number>();
  for (const a of agendamentosDoDia) {
    const chave = a.horario.slice(0, 5);
    ocupacaoPorHorario.set(chave, (ocupacaoPorHorario.get(chave) ?? 0) + 1);
  }

  return gerarBlocosDoDia(config, dataISO).filter(
    (bloco) => (ocupacaoPorHorario.get(bloco) ?? 0) < config.vagasPorHorario
  );
}

/** Primeiro dia (a partir de hoje, em São Paulo) que tem pelo menos um horário livre — usado pra
 * decidir em que mês/dia abrir o calendário por padrão. `null` se não achar nada nos próximos
 * `limiteDeDias`. */
export async function proximoDiaComVaga(
  supabase: SupabaseClient,
  accountId: string,
  config: ConfigAgendamento,
  limiteDeDias = 60
): Promise<string | null> {
  const hoje = agoraEmSaoPaulo();
  for (let i = 0; i < limiteDeDias; i++) {
    const dataISO = paraISO(somarDias(hoje, i));
    const blocos = gerarBlocosDoDia(config, dataISO);
    if (blocos.length === 0) continue;

    const { data } = await supabase
      .from("chatbot_agendamentos")
      .select("horario")
      .eq("account_id", accountId)
      .eq("data_agendamento", dataISO);

    if (horariosDisponiveis(config, dataISO, data ?? []).length > 0) return dataISO;
  }
  return null;
}
