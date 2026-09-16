import { Interruptor } from "./Interruptor";

const SERVICOS = [
  {
    chave: "direct" as const,
    rotulo: "Direct",
    action: "/api/contas/direct-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar o Chatbot Direct nessa conta? O bot para de responder por palavra-chave/Gemini — Reserva, Agendamento e Busca ao Vivo continuam funcionando normalmente se estiverem ligados.",
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
    rotulo: "Busca ao Vivo",
    action: "/api/contas/busca-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar a Busca ao Vivo nessa conta? A configuração fica escondida até você ativar de novo.",
  },
  {
    chave: "stories" as const,
    rotulo: "Agendador de Stories",
    action: "/api/contas/agendador-stories-status",
    mensagemConfirmarDesligar:
      "Tem certeza que deseja desativar o Agendador de Stories nessa conta? Isso pausa a publicação automática de Stories lá no outro app também.",
  },
];

type ChaveDeServico = (typeof SERVICOS)[number]["chave"];

// Um ícone por produto — usado tanto na lista aberta do dropdown quanto (só dos que estiverem
// ligados) na própria linha do "Produtos ativos", no lugar do contador "2/4" de antes.
function IconeDoProduto({ chave, className }: { chave: ChaveDeServico; className?: string }) {
  const comum = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  switch (chave) {
    case "direct":
      // Balão de chat — palavra-chave + Gemini.
      return (
        <svg {...comum}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case "reserva":
      // Ticket — mesmo desenho usado em toda a área de /reservas (CAMINHO_TICKET).
      return (
        <svg {...comum}>
          <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z" />
        </svg>
      );
    case "agendamento":
      // Calendário — mesmo desenho usado no cabeçalho de cada dia em /reservas.
      return (
        <svg {...comum}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "busca":
      // Lupa — busca no site externo.
      return (
        <svg {...comum}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "stories":
      // Câmera — publicação automática de Stories (app separado, Agendador de Stories).
      return (
        <svg {...comum}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
  }
}

/**
 * Dropdown "Produtos ativos" no cartão da conta em /contas, com uma chavinha por serviço —
 * Direct (palavra-chave + Gemini), Reserva, Agendamento, Busca ao Vivo e Agendador de Stories
 * (esse último é um app separado, mas que vive no mesmo projeto Supabase — ver
 * /api/contas/agendador-stories-status). Direct é separado do
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
  storiesHabilitado,
}: {
  contaId: string;
  directHabilitado: boolean;
  reservaHabilitada: boolean;
  agendamentoHabilitado: boolean;
  buscaHabilitada: boolean;
  storiesHabilitado: boolean;
}) {
  const estadoPorChave: Record<ChaveDeServico, boolean> = {
    direct: directHabilitado,
    reserva: reservaHabilitada,
    agendamento: agendamentoHabilitado,
    busca: buscaHabilitada,
    stories: storiesHabilitado,
  };

  const servicosAtivos = SERVICOS.filter((servico) => estadoPorChave[servico.chave]);

  return (
    <details className="group rounded-xl border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-neutral-300 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          Produtos ativos
          <span className="flex items-center gap-1.5">
            {servicosAtivos.length > 0 ? (
              servicosAtivos.map((servico) => (
                // Bolinha de vidro individual por produto — antes eram ícones soltos dentro de
                // uma pílula só, meio apertados; separadas assim fica mais fácil bater o olho e
                // identificar rápido quais produtos estão ligados. Sem backdrop-filter aqui de
                // propósito (o cartão da conta já tem o dele) — empilhar blur dentro de blur já
                // deu artefato visual conhecido no Safari/WebKit (mesmo motivo documentado em
                // AbasDaConta.tsx).
                <span
                  key={servico.chave}
                  title={servico.rotulo}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/25 text-white shadow-[0_0_6px_rgba(99,102,241,0.45)]"
                >
                  <IconeDoProduto chave={servico.chave} className="h-3.5 w-3.5" />
                </span>
              ))
            ) : (
              <span className="text-[10px] text-neutral-600">nenhum</span>
            )}
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
              <span className={`flex items-center gap-1.5 text-xs ${ligado ? "text-neutral-200" : "text-neutral-500"}`}>
                <IconeDoProduto chave={servico.chave} className="h-3.5 w-3.5" />
                {servico.rotulo}
              </span>
              <Interruptor ligado={ligado} mensagemConfirmarDesligar={servico.mensagemConfirmarDesligar} />
            </form>
          );
        })}
      </div>
    </details>
  );
}
