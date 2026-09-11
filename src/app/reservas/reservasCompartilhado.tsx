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
  // Só vem preenchida na tela "Hoje" (busca ao vivo na Meta, ver PainelDeReservas.tsx) — nas
  // outras telas (Antigas/Futuras) fica undefined de propósito, pra não pesar com reservas em
  // volume bem maior.
  fotoDePerfilUrl?: string | null;
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

// Mesma família visual do selo "Hoje" do cabeçalho do dia (borda + fundo bem suaves na cor, texto
// só um pouco mais claro) — antes cada período tinha um preenchimento sólido próprio competindo
// com o resto da tela, que hoje usa só índigo (+ âmbar aqui, de propósito, pra diferenciar almoço
// de jantar de relance).
const ESTILO_DO_PERIODO: Record<string, { rotulo: string; caminho: string; cor: string }> = {
  almoco: { rotulo: "Almoço", caminho: CAMINHO_SOL, cor: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  jantar: { rotulo: "Jantar", caminho: CAMINHO_LUA, cor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30" },
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

export function CartaoDeReserva({
  reserva,
  hrefAtualizar,
  indice = 0,
}: {
  reserva: Reserva;
  hrefAtualizar: string;
  /** Só pra escalonar a animação de entrada (cada reserva aparece um pouquinho depois da
   * anterior) — não afeta nada visual além disso. */
  indice?: number;
}) {
  return (
    // Vidro (Liquid Glass): mais escuro/recuado que o card do dia que o envolve — em vez de
    // competir em claridade com ele, fica como se estivesse "afundado" dentro, com só um traço de
    // luz fino no topo (before:) simulando o reflexo de uma superfície líquida.
    <div
      className="animate-entrada relative rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-white/[0.025] to-[#0c0c0f]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_14px_30px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl before:absolute before:inset-x-[12%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-[''] motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(indice * 45, 300)}ms` }}
    >
      {/* Identidade do cliente (nome, @usuário com selo do Instagram, WhatsApp) + o bloco de
          pessoas, alinhados no centro — @usuário e WhatsApp uma embaixo da outra, em vez de
          WhatsApp lá embaixo brigando com as ações. */}
      <div className="flex items-center gap-3">
        {reserva.fotoDePerfilUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reserva.fotoDePerfilUrl}
            alt=""
            className="h-12 w-12 shrink-0 self-start rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full bg-violet-950 text-violet-300">
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
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-neutral-100">
            {reserva.cliente_nome ?? "Cliente"}
          </p>

          {reserva.cliente_instagram_username && (
            <a
              href={`https://instagram.com/${reserva.cliente_instagram_username}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-purple-400/80">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
              </svg>
              <span className="truncate">@{reserva.cliente_instagram_username}</span>
            </a>
          )}

          {reserva.whatsapp && (
            <a
              href={linkDoWhatsapp(reserva.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-emerald-500/80">
                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 3.15L3 21" />
              </svg>
              <span className="truncate">{reserva.whatsapp}</span>
            </a>
          )}
        </div>

        {/* Mesmo preenchimento em degradê índigo (+ brilho de topo) dos cards de estatística lá
            em cima, em vez de só uma borda com fundo quase transparente. */}
        <div className="relative flex shrink-0 min-w-[62px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-3 py-2 backdrop-blur-xl before:absolute before:inset-x-[15%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-['']">
          <span className="text-base font-semibold leading-none text-neutral-100">
            {reserva.quantidade_pessoas ?? "—"}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-500">
            <Icone path={CAMINHO_PESSOAS} className="h-3 w-3 text-indigo-400" />
            pessoas
          </span>
        </div>
      </div>

      {/* Editar/Excluir à esquerda (discretos, sem caixa) e o horário de confirmação à direita. */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-900 pt-3">
        <div className="flex items-center gap-1">
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
        <span className="text-xs text-neutral-600">confirmada às {formatarHora(reserva.confirmado_em)}</span>
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
          : { barra: "bg-indigo-500", texto: "text-indigo-400" };
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
        {reservas.map((reserva, indice) => (
          <CartaoDeReserva key={reserva.id} reserva={reserva} hrefAtualizar={hrefAtualizar} indice={indice} />
        ))}
      </div>
    </div>
  );
}
