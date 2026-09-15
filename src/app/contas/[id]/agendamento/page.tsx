import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoAtivarAgendamento } from "@/app/contas/BotaoAtivarAgendamento";
import DatasBloqueadasEditor from "../reserva/DatasBloqueadasEditor";
import HorariosSemanaEditor from "./HorariosSemanaEditor";
import CamposPersonalizadosEditor from "./CamposPersonalizadosEditor";
import { buscarConfigAgendamento, DIAS_DA_SEMANA_PADRAO } from "@/lib/agendamentos";

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
        <h2 className="text-lg font-semibold">Agendamento</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Fluxo automático de agendamento por calendário e blocos de horário (ex: salão de beleza,
          clínica) — igual ao espírito da Reserva, mas com dia escolhido num calendário completo e
          horário escolhido dentro dos blocos que você configurar, em vez de Almoço/Jantar.
        </p>

        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-700 px-4 py-6">
          <p className="text-sm text-neutral-400">
            Agendamento está desativado pra essa conta — a configuração fica escondida e o bot
            nunca entra nesse fluxo até você ativar.
          </p>
          <form action="/api/contas/agendamento-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/agendamento`} />
            <BotaoAtivarAgendamento habilitado={false} />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Agendamento</h2>
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
          <BotaoAtivarAgendamento habilitado={true} />
        </form>
      </div>

      {searchParams.salvo && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950 px-4 py-2 text-sm text-green-300">
          Configuração salva.
        </div>
      )}
      {searchParams.erro && (
        <div className="mt-4 break-words rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {searchParams.erro}
        </div>
      )}

      <form action="/api/agendamento-config" method="POST" className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className="text-xs text-neutral-400">
            Palavra-chave que inicia o fluxo de agendamento
          </label>
          <input
            type="text"
            name="palavra_chave_agendamento"
            defaultValue={config.palavraChave ?? ""}
            placeholder="Ex: agendar, agendamento, marcar horário"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Pode escrever mais de uma variação separada por vírgula. Diferente da palavra-chave de
            Reserva — os dois fluxos nunca se confundem.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 shadow-md shadow-black/30 [backdrop-filter:blur(18px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(18px)_url(#vidro-cartao-contas)]">
          <p className="text-sm font-medium text-neutral-200">Horário de funcionamento</p>
          <p className="mt-1 text-xs text-neutral-500">
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

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 shadow-md shadow-black/30 [backdrop-filter:blur(18px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(18px)_url(#vidro-cartao-contas)]">
          <p className="text-sm font-medium text-neutral-200">Blocos de horário</p>
          <p className="mt-1 text-xs text-neutral-500">
            De quanto em quanto tempo um novo horário fica disponível dentro da janela acima (ex:
            09:00, depois 09:30, 10:00...), e quantos agendamentos cabem em cada um desses blocos ao
            mesmo tempo.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-neutral-400">Intervalo entre horários</label>
              <select
                name="agendamento_intervalo_minutos"
                defaultValue={config.intervaloMinutos}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1 hora e 30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400">Vagas simultâneas por horário</label>
              <input
                type="number"
                min={1}
                name="agendamento_vagas_por_horario"
                defaultValue={config.vagasPorHorario}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Deixe 1 se só uma pessoa atende por vez. Aumente se tiver mais de um profissional
                livre no mesmo horário.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 shadow-md shadow-black/30 [backdrop-filter:blur(18px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(18px)_url(#vidro-cartao-contas)]">
          <p className="text-sm font-medium text-neutral-200">Perguntas extras</p>
          <p className="mt-1 text-xs text-neutral-500">
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
          <label className="text-xs text-neutral-400">Saudação inicial</label>
          <p className="mt-1 text-xs text-neutral-500">
            Mandada assim que o cliente digita a palavra-chave, antes da primeira pergunta.
          </p>
          <textarea
            name="agendamento_msg_inicial"
            rows={2}
            defaultValue={config.msgInicial ?? ""}
            placeholder="(em branco = sem saudação, vai direto pro calendário)"
            className="mt-1 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">
            Regras (mostradas antes do pedido de confirmação)
          </label>
          <textarea
            name="agendamento_regras_texto"
            rows={4}
            defaultValue={config.regrasTexto ?? ""}
            placeholder="Ex: chegue com 10 minutos de antecedência"
            className="mt-1 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">Mensagem quando o agendamento é confirmado</label>
          <textarea
            name="agendamento_msg_confirmada"
            rows={3}
            defaultValue={config.msgConfirmada ?? ""}
            placeholder="Agendamento confirmado! Te esperamos por lá."
            className="mt-1 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">Mensagem quando o cliente cancela</label>
          <textarea
            name="agendamento_msg_recusada"
            rows={3}
            defaultValue={config.msgRecusada ?? ""}
            placeholder="Sem problema, fica pra próxima!"
            className="mt-1 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 shadow-md shadow-black/30 [backdrop-filter:blur(18px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(18px)_url(#vidro-cartao-contas)]">
          <p className="text-sm font-medium text-neutral-200">Bloquear datas específicas</p>
          <p className="mt-1 text-xs text-neutral-500">
            Bloqueia dias inteiros (feriados, etc) — o resto do fluxo continua funcionando normal.
          </p>
          <div className="mt-3">
            <DatasBloqueadasEditor
              nome="agendamento_datas_bloqueadas"
              valorInicial={config.datasBloqueadasTexto ?? ""}
            />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 shadow-md shadow-black/30 [backdrop-filter:blur(18px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(18px)_url(#vidro-cartao-contas)]">
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input
              type="checkbox"
              name="agendamento_pausa_ativa"
              defaultChecked={config.pausaAtiva}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            Pausar agendamentos temporariamente
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Enquanto marcado, quem mandar a palavra-chave recebe a mensagem abaixo em vez de
            começar o fluxo. Não desliga sozinho — é preciso desmarcar essa caixinha manualmente.
          </p>
          <div className="mt-3">
            <label className="text-xs text-neutral-400">Mensagem durante a pausa</label>
            <textarea
              name="agendamento_pausa_mensagem"
              rows={3}
              defaultValue={config.pausaMensagem ?? ""}
              placeholder="No momento não estamos aceitando novos agendamentos por aqui."
              className="mt-1 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-500"
        >
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
