import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import DatasBloqueadasEditor from "../reserva/DatasBloqueadasEditor";
import HorariosSemanaEditor from "./HorariosSemanaEditor";
import CamposPersonalizadosEditor from "./CamposPersonalizadosEditor";
import { buscarConfigAgendamento, DIAS_DA_SEMANA_PADRAO } from "@/lib/agendamentos";
import {
  CLASSE_CAMPO,
  CLASSE_CAMPO_TEXTAREA,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
  CLASSE_CHECKBOX,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
  CLASSE_SECAO,
  CLASSE_TITULO_SECAO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AgendamentoConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();
  const config = await buscarConfigAgendamento(admin, params.id);

  // Agendamento desligado nessa conta — mesmo espírito da tela de Reserva: some a configuração,
  // só mostra o jeito de ligar de novo. Toda conta nova/existente começa aqui (agendamento_
  // habilitado default false no banco).
  if (!config?.habilitado) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Agendamento</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Fluxo automático de agendamento por calendário e blocos de horário (ex: salão de beleza,
          clínica) — igual ao espírito da Reserva, mas com dia escolhido num calendário completo e
          horário escolhido dentro dos blocos que você configurar, em vez de Almoço/Jantar.
        </p>

        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">
            Agendamento está desativado pra essa conta — a configuração fica escondida e o bot
            nunca entra nesse fluxo até você ativar.
          </p>
          <form action="/api/contas/agendamento-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/agendamento`} />
            <Interruptor ligado={false} rotulo="Ativar Agendamento" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Agendamento</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Só entra em ação quando o cliente manda a palavra-chave configurada aqui. Depois disso,
            o bot pergunta o dia (calendário), o horário (dentro dos blocos livres), as perguntas
            extras que você montar, nome e WhatsApp, e pede confirmação — tudo por conta própria.
          </p>
        </div>
        <form action="/api/contas/agendamento-status" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={`/contas/${params.id}/agendamento`} />
          <Interruptor
            ligado={true}
            rotulo="Agendamento ativo"
            mensagemConfirmarDesligar="Tem certeza que deseja desativar o Agendamento nessa conta? O bot para de aceitar novos agendamentos e a configuração fica escondida até você ativar de novo."
          />
        </form>
      </div>

      {searchParams.salvo && (
        <div className={CLASSE_AVISO_SALVO}>
          Configuração salva.
        </div>
      )}
      {searchParams.erro && (
        <div className={CLASSE_AVISO_ERRO}>
          {searchParams.erro}
        </div>
      )}

      <form action="/api/agendamento-config" method="POST" className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className={CLASSE_RÓTULO}>
            Palavra-chave que inicia o fluxo de agendamento
          </label>
          <input
            type="text"
            name="palavra_chave_agendamento"
            defaultValue={config.palavraChave ?? ""}
            placeholder="Ex: agendar, agendamento, marcar horário"
            className={CLASSE_CAMPO}
          />
          <p className={CLASSE_AJUDA}>
            Pode escrever mais de uma variação separada por vírgula. Diferente da palavra-chave de
            Reserva — os dois fluxos nunca se confundem.
          </p>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Horário de funcionamento</p>
          <p className={CLASSE_AJUDA}>
            Define em quais dias da semana e em qual janela de horário os blocos são gerados. Fora
            dessa janela (ou num dia desmarcado), não aparece nenhum horário pro cliente escolher.
          </p>
          <div className="mt-3">
            <HorariosSemanaEditor
              nome="agendamento_horarios"
              valorInicial={config.horarios.length > 0 ? config.horarios : DIAS_DA_SEMANA_PADRAO}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Blocos de horário</p>
          <p className={CLASSE_AJUDA}>
            De quanto em quanto tempo um novo horário fica disponível dentro da janela acima (ex:
            09:00, depois 09:30, 10:00...), e quantos agendamentos cabem em cada um desses blocos ao
            mesmo tempo.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CLASSE_RÓTULO}>Intervalo entre horários</label>
              <select
                name="agendamento_intervalo_minutos"
                defaultValue={config.intervaloMinutos}
                className={CLASSE_CAMPO}
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1 hora e 30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
            <div>
              <label className={CLASSE_RÓTULO}>Vagas simultâneas por horário</label>
              <input
                type="number"
                min={1}
                name="agendamento_vagas_por_horario"
                defaultValue={config.vagasPorHorario}
                className={CLASSE_CAMPO}
              />
              <p className={CLASSE_AJUDA}>
                Deixe 1 se só uma pessoa atende por vez. Aumente se tiver mais de um profissional
                livre no mesmo horário.
              </p>
            </div>
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Perguntas extras</p>
          <p className={CLASSE_AJUDA}>
            Além de dia, horário, nome e WhatsApp (sempre perguntados), monte aqui quantas perguntas
            a mais quiser, na ordem em que devem aparecer.
          </p>
          <div className="mt-3">
            <CamposPersonalizadosEditor
              nome="agendamento_campos_personalizados"
              valorInicial={config.camposPersonalizados}
            />
          </div>
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Saudação inicial</label>
          <p className={CLASSE_AJUDA}>
            Mandada assim que o cliente digita a palavra-chave, antes da primeira pergunta.
          </p>
          <textarea
            name="agendamento_msg_inicial"
            rows={2}
            defaultValue={config.msgInicial ?? ""}
            placeholder="(em branco = sem saudação, vai direto pro calendário)"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>
            Regras (mostradas antes do pedido de confirmação)
          </label>
          <textarea
            name="agendamento_regras_texto"
            rows={4}
            defaultValue={config.regrasTexto ?? ""}
            placeholder="Ex: chegue com 10 minutos de antecedência"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Mensagem quando o agendamento é confirmado</label>
          <textarea
            name="agendamento_msg_confirmada"
            rows={3}
            defaultValue={config.msgConfirmada ?? ""}
            placeholder="Agendamento confirmado! Te esperamos por lá."
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Mensagem quando o cliente cancela</label>
          <textarea
            name="agendamento_msg_recusada"
            rows={3}
            defaultValue={config.msgRecusada ?? ""}
            placeholder="Sem problema, fica pra próxima!"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div className={CLASSE_SECAO}>
          <p className={CLASSE_TITULO_SECAO}>Bloquear datas específicas</p>
          <p className={CLASSE_AJUDA}>
            Bloqueia dias inteiros (feriados, etc) — o resto do fluxo continua funcionando normal.
          </p>
          <div className="mt-3">
            <DatasBloqueadasEditor
              nome="agendamento_datas_bloqueadas"
              valorInicial={config.datasBloqueadasTexto ?? ""}
            />
          </div>
        </div>

        <div className={CLASSE_SECAO}>
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input
              type="checkbox"
              name="agendamento_pausa_ativa"
              defaultChecked={config.pausaAtiva}
              className={CLASSE_CHECKBOX}
            />
            Pausar agendamentos temporariamente
          </label>
          <p className={CLASSE_AJUDA}>
            Enquanto marcado, quem mandar a palavra-chave recebe a mensagem abaixo em vez de
            começar o fluxo. Não desliga sozinho — é preciso desmarcar essa caixinha manualmente.
          </p>
          <div className="mt-3">
            <label className={CLASSE_RÓTULO}>Mensagem durante a pausa</label>
            <textarea
              name="agendamento_pausa_mensagem"
              rows={3}
              defaultValue={config.pausaMensagem ?? ""}
              placeholder="No momento não estamos aceitando novos agendamentos por aqui."
              className={CLASSE_CAMPO_TEXTAREA}
            />
          </div>
        </div>

        <button
          type="submit"
          className={CLASSE_BOTAO_SALVAR}
        >
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
