import { Interruptor } from "./Interruptor";

const SERVICOS = [
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
 * As 3 chavinhas de serviço direto no cartão da conta em /contas — antes só davam pra ligar
 * entrando na própria aba do serviço (que, desligado, nem aparecia no menu: um beco sem saída
 * sem essa entrada aqui). Cada linha já POSTa pra rota de status de sempre (mesmas 3 rotas usadas
 * dentro de cada aba), só mudando de onde é disparado — redirect_to volta pra /contas, não pra
 * dentro da conta, já que é daqui que a pessoa está mexendo.
 */
export function ChavesDeServico({
  contaId,
  reservaHabilitada,
  agendamentoHabilitado,
  buscaHabilitada,
}: {
  contaId: string;
  reservaHabilitada: boolean;
  agendamentoHabilitado: boolean;
  buscaHabilitada: boolean;
}) {
  const estadoPorChave: Record<(typeof SERVICOS)[number]["chave"], boolean> = {
    reserva: reservaHabilitada,
    agendamento: agendamentoHabilitado,
    busca: buscaHabilitada,
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
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
  );
}
