import { FormularioDeEdicaoDeReserva } from "./FormularioDeEdicaoDeReserva";
import { BotaoExcluirReserva } from "./BotaoExcluirReserva";

// Tudo neste arquivo é usado tanto pela tela "Hoje" (Server Component, com dados já carregados)
// quanto pela tela Antigas/Futuras (o dia é um Client Component que busca os dados sob demanda,
// só quando a pessoa abre o dropdown daquele dia — ver DiaComCarregamentoSobDemanda.tsx). Por isso
// nada aqui pode depender de `next/headers` nem de outra coisa exclusiva de servidor.

export type Reserva = {
  id: string;
  instagram_scoped_id: string;
  cliente_nome: string | null;
  cliente_instagram_username: string | null;
  data_reserva: string;
  periodo: string | null;
  quantidade_pessoas: number | null;
  whatsapp: string | null;
  confirmado_em: string;
};

export function Icone({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export const CAMINHO_PESSOAS =
  "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75";
export const CAMINHO_TICKET =
  "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z";
const CAMINHO_SOL =
  "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42";
const CAMINHO_LUA = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";

const ESTILO_DO_PERIODO: Record<string, { rotulo: string; caminho: string; cor: string }> = {
  almoco: { rotulo: "Almoço", caminho: CAMINHO_SOL, cor: "bg-amber-950 text-amber-300 border-amber-900/60" },
  jantar: { rotulo: "Jantar", caminho: CAMINHO_LUA, cor: "bg-indigo-950 text-indigo-300 border-indigo-900/60" },
};

export function estiloDoPeriodo(periodo: string) {
  return (
    ESTILO_DO_PERIODO[periodo] ?? {
      rotulo: periodo,
      caminho: CAMINHO_TICKET,
      cor: "bg-neutral-800 text-neutral-300 border-neutral-700",
    }
  );
}

export function formatarHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Link de WhatsApp a partir do que o cliente digitou — assume DDI 55 (Brasil) quando o número
 * já não vem com um (10-11 dígitos é DDD+número, sem DDI). */
export function linkDoWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const comDDI = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${comDDI}`;
}

export function CartaoDeReserva({ reserva, hrefAtualizar }: { reserva: Reserva; hrefAtualizar: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      {/* Identidade do cliente + badge de pessoas, com mais espaço e o nome maior — antes tudo
          (nome, @usuário, telefone, horário e as ações) ficava espremido numa linha só. */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-950 text-violet-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20.5c0-4.14 3.58-7.5 8-7.5s8 3.36 8 7.5" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-neutral-100">
                {reserva.cliente_nome ?? "Cliente"}
              </p>
              {reserva.cliente_instagram_username && (
                <a
                  href={`https://instagram.com/${reserva.cliente_instagram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-neutral-500 hover:text-neutral-300"
                >
                  @{reserva.cliente_instagram_username}
                </a>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-violet-950/60">
              {reserva.quantidade_pessoas ?? "—"} pessoa
              {reserva.quantidade_pessoas === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
            {reserva.whatsapp && (
              <a
                href={linkDoWhatsapp(reserva.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-neutral-200"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 3.15L3 21" />
                </svg>
                {reserva.whatsapp}
              </a>
            )}
            <span>confirmada às {formatarHora(reserva.confirmado_em)}</span>
          </div>
        </div>
      </div>

      {/* Ações num rodapé separado por uma linha, em vez de espremidas do lado do badge — ficam
          maiores e mais fáceis de tocar. */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-900 pt-3">
        <FormularioDeEdicaoDeReserva
          action={`/api/reservas/${reserva.id}/editar`}
          redirectTo={hrefAtualizar}
          nomeCliente={reserva.cliente_nome ?? "esse cliente"}
          quantidadeAtual={reserva.quantidade_pessoas ?? 1}
        />
        <BotaoExcluirReserva
          action={`/api/reservas/${reserva.id}/excluir`}
          redirectTo={hrefAtualizar}
          nomeCliente={reserva.cliente_nome ?? "esse cliente"}
        />
      </div>
    </div>
  );
}

export function CartaoDePeriodo({
  periodo,
  reservas,
  limiteMaximo,
  hrefAtualizar,
}: {
  periodo: string;
  reservas: Reserva[];
  limiteMaximo: number | null;
  hrefAtualizar: string;
}) {
  const totalDePessoasDoGrupo = reservas.reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  const percentual =
    typeof limiteMaximo === "number" && limiteMaximo > 0
      ? Math.min(100, Math.round((totalDePessoasDoGrupo / limiteMaximo) * 100))
      : null;
  // Azul (mesmo tom dos botões/destaques da tela) pra ocupação tranquila; amber e vermelho
  // continuam de aviso mesmo, pra não perder o sinal de "atenção" quando a capacidade aperta. Sem
  // caixa/borda própria (isso virou uma seção dentro do cartão do dia, não um cartão à parte) — o
  // sinal de status agora é só a cor da barra + do texto de "X/Y pessoas".
  const status =
    percentual === null
      ? { barra: "bg-neutral-600", texto: "text-neutral-400" }
      : percentual >= 100
        ? { barra: "bg-red-500", texto: "text-red-400" }
        : percentual >= 70
          ? { barra: "bg-amber-500", texto: "text-amber-400" }
          : { barra: "bg-sky-500", texto: "text-sky-400" };
  const estiloPeriodo = estiloDoPeriodo(periodo);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${estiloPeriodo.cor}`}>
          <Icone path={estiloPeriodo.caminho} className="h-3.5 w-3.5" />
          {estiloPeriodo.rotulo}
        </span>
        <span className={`flex items-center gap-1 text-xs font-medium ${status.texto}`}>
          <Icone path={CAMINHO_PESSOAS} className="h-3.5 w-3.5" />
          {totalDePessoasDoGrupo}
          {typeof limiteMaximo === "number" ? ` / ${limiteMaximo}` : ""} pessoas
        </span>
      </div>

      {percentual !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className={`h-full rounded-full ${status.barra}`} style={{ width: `${percentual}%` }} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {reservas.map((reserva) => (
          <CartaoDeReserva key={reserva.id} reserva={reserva} hrefAtualizar={hrefAtualizar} />
        ))}
      </div>
    </div>
  );
}
