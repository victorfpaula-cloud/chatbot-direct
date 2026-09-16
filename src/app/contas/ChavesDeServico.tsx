import { Interruptor } from "./Interruptor";

const SERVICOS = [
  {
    chave: "direct" as const,
    rotulo: "Direct",
    action: "/api/contas/direct-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar o Chatbot Direct nessa conta? O bot para de responder por palavra-chave/Gemini — Reserva, Agendamento e Busca Automática continuam funcionando normalmente se estiverem ligados.",
  },
  {
    chave: "reserva" as const,
    rotulo: "Reserva",
    action: "/api/contas/reservas-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar reservas nessa conta? O bot para de aceitar novas reservas e a configuração fica escondida até você ativar de novo.",
  },
  {
    chave: "agendamento" as const,
    rotulo: "Agendamento",
    action: "/api/contas/agendamento-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar o Agendamento nessa conta? O bot para de aceitar novos agendamentos e a configuração fica escondida até você ativar de novo.",
  },
  {
    chave: "busca" as const,
    rotulo: "Busca Automática",
    action: "/api/contas/busca-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar a Busca Automática nessa conta? A configuração fica escondida até você ativar de novo.",
  },
];

/**
 * Dropdown "Produtos" no cartão da conta em /contas, com uma chavinha por serviço — Direct
 * (palavra-chave + Gemini), Reserva, Agendamento e Busca Automática. Direct é separado do
 * "Pausar" (que desliga TUDO junto): existe conta que contrata só Reserva sem contratar o
 * Chatbot Direct, então precisa dar pra desligar cada um por si. Cada linha já POSTa pra rota de
 * status de sempre (mesmas rotas usadas dentro de cada aba), só mudando de onde é disparado —
 * redirect_to volta pra /contas, não pra dentro da conta, já que é daqui que a pessoa está mexendo.
 */
export function ChavesDeServico({
  contaId,
  directHabilitado,
  reservaHabilitada,
  agendamentoHabilitado,
  buscaHabilitada,
}: {
  contaId: string;
  directHabilitado: boolean;
  reservaHabilitada: boolean;
  agendamentoHabilitado: boolean;
  buscaHabilitada: boolean;
}) {
  const estadoPorChave: Record<(typeof SERVICOS)[number]["chave"], boolean> = {
    direct: directHabilitado,
    reserva: reservaHabilitada,
    agendamento: agendamentoHabilitado,
    busca: buscaHabilitada,
  };

  const quantidadeAtiva = Object.values(estadoPorChave).filter(Boolean).length;

  return (
    <details className="group rounded-xl border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-neutral-300 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          Produtos
          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {quantidadeAtiva}/{SERVICOS.length}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="flex flex-col gap-2 border-t border-white/10 px-3.5 py-3">
        {SERVICOS.map((servico) => {
          const ligado = estadoPorChave[servico.chave];
          return (
            <form
              key={servico.chave}
              action={servico.action}
              method="POST"
              className="flex items-center justify-between gap-2"
            >
              <input type="hidden" name="account_id" value={contaId} />
              <input type="hidden" name="habilitar" value={ligado ? "0" : "1"} />
              <input type="hidden" name="redirect_to" value="/contas" />
              <span className={`text-xs ${ligado ? "text-neutral-200" : "text-neutral-500"}`}>{servico.rotulo}</span>
              <Interruptor ligado={ligado} mensagemConfirmarDesligar={servico.mensagemConfirmarDesligar} />
            </form>
          );
        })}
      </div>
    </details>
  );
}
