import { FormularioDeEdicaoDeReserva } from "./FormularioDeEdicaoDeReserva";
import { BotaoExcluirReserva } from "./BotaoExcluirReserva";
import { BotaoConfirmarPresenca } from "./BotaoConfirmarPresenca";

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
  // Foto cadastrada à mão direto no banco (chatbot_reservations.foto_manual_url) — cobre reservas
  // cuja foto nunca vai dar pra buscar ao vivo (ex.: "manual:...", ou contato apagado da
  // SendPulse depois). Só relevante na tela "Hoje" (ver PainelDeReservas.tsx), igual
  // fotoDePerfilUrl abaixo.
  foto_manual_url?: string | null;
  // Só vem preenchida na tela "Hoje" (busca ao vivo na Meta, ver PainelDeReservas.tsx) — nas
  // outras telas (Antigas/Futuras) fica undefined de propósito, pra não pesar com reservas em
  // volume bem maior.
  fotoDePerfilUrl?: string | null;
  // "Check-in" feito pelo funcionário (botão Confirmar/Chegou) — ver BotaoConfirmarPresenca.tsx.
  presenca_confirmada: boolean;
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
export const CAMINHO_FUNIL = "M22 3H2l8 9.46V19l4 2v-8.54L22 3z";
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

// Cartão do dia inteiro (cabeçalho + períodos), compartilhado entre a tela "Hoje"
// (PainelDeReservas.tsx, dados já prontos) e Antigas/Futuras (DiaComCarregamentoSobDemanda.tsx,
// dados sob demanda) — exportado daqui pra NUNCA mais os dois ficarem com aparência diferente por
// engano (foi exatamente isso que aconteceu: o vidro do Liquid Glass só tinha ido pra um dos dois).
// SEM `overflow-hidden` de propósito (regressão encontrada e corrigida: tinha voltado escondido
// no meio do resto do Liquid Glass) — com ele, a caixinha de "Editar" (que abre pra baixo, às
// vezes além da altura do cartão) ficava cortada, e o combo overflow-hidden + backdrop-blur +
// rounded-2xl num `<details>` que muda de altura (abre/fecha) é conhecido por dar rendering
// errado no Safari/WebKit — provavelmente a causa da "faixa cortada" relatada em Antigas/Futuras.
// [backdrop-filter:...]/[-webkit-backdrop-filter:...] no lugar de backdrop-blur-xl: mesmo blur de
// antes (24px), só que agora referenciando o filtro SVG de refração de borda (ver
// src/app/reservas/VidroLiquido.tsx, #vidro-painel) — efeito completo só no Chrome/Edge, Safari e
// Firefox ignoram a parte url(...) sozinhos e ficam só com o blur de sempre, sem quebrar nada.
export const CLASSE_CARTAO_DO_DIA =
  "animate-entrada relative rounded-2xl border-2 border-indigo-500/15 bg-white/[0.08] [backdrop-filter:blur(24px)_url(#vidro-painel)] [-webkit-backdrop-filter:blur(24px)_url(#vidro-painel)] shadow-[0_18px_42px_-16px_rgba(99,102,241,0.2),0_6px_14px_-6px_rgba(0,0,0,0.55)] before:absolute before:inset-x-[8%] before:top-0 before:z-10 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-[''] motion-reduce:animate-none";

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

/** Só dia/mês (ex.: "11/09") — a data de confirmação de uma reserva feita há mais tempo (Antigas)
 * não necessariamente é a mesma data reservada, então só a hora sozinha não bastava. */
export function formatarDataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
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
  const confirmado = reserva.presenca_confirmada;

  return (
    // Vidro (Liquid Glass): mais escuro/recuado que o card do dia que o envolve — em vez de
    // competir em claridade com ele, fica como se estivesse "afundado" dentro, com só um traço de
    // luz fino no topo (before:) simulando o reflexo de uma superfície líquida. Sem
    // `backdrop-blur` própria (o card do dia por fora já borra o fundo de verdade — desfocar de
    // novo aqui só borraria a superfície quase lisa do próprio card do dia, sem ganho visual, só
    // custo de desempenho e, em alguns celulares/WebKit, artefato visual com vários desses
    // aninhados na tela ao mesmo tempo).
    // has-[details[open]]:z-20 — a animação de entrada (animate-entrada) aplica um transform em
    // CADA cartão, e transform cria um contexto de empilhamento próprio: sem isso, o cartão de
    // baixo (mais novo, vem depois no DOM) sempre pinta por cima da caixinha de "Editar" do cartão
    // de cima, mesmo ela tendo z-10 — o z-10 só vale DENTRO do contexto do próprio cartão, preso
    // por causa do transform, sem conseguir competir com o cartão vizinho. Erguer o cartão inteiro
    // (não só a caixinha) resolve, porque aí ele já sobe acima do vizinho antes de chegar nela.
    //
    // Confirmado (já chegou): fica um vidro fosco ESCURO — não um cartão translúcido com
    // opacidade baixa. Essa foi a primeira tentativa (opacity: 0.15 no cartão inteiro) e não
    // funcionou: opacity mistura com o que tem ATRÁS, que aqui é o vidro claro do cartão do dia
    // (+ os borrões coloridos do fundo passando atrás dele) — baixar a opacidade só deixava tudo
    // mais CLARO, nunca mais escuro, então nunca "desaparecia" de verdade. A cor escura agora vem
    // do próprio preenchimento do cartão (bg-black/60, não transparente-pra-revelar-o-que-tem-atrás),
    // e o texto por dentro é escurecido à parte (branco em alpha baixo) — assim ele realmente funde
    // com esse fundo escuro próprio, em vez de depender de quão claro ou escuro o resto da tela
    // por trás dele por acaso está.
    <div
      className={
        confirmado
          ? "animate-entrada relative rounded-2xl border border-white/5 bg-black/60 px-4 py-4 [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)] motion-reduce:animate-none has-[details[open]]:z-20"
          : "animate-entrada relative rounded-2xl border-2 border-indigo-400/15 bg-gradient-to-br from-white/[0.06] to-[#0c0c0f]/95 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_14px_30px_-16px_rgba(0,0,0,0.6)] before:absolute before:inset-x-[12%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-[''] motion-reduce:animate-none has-[details[open]]:z-20"
      }
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
          <div
            className={
              confirmado
                ? "flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full border border-white/5 bg-white/[0.03] text-white/30"
                : "flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full border border-indigo-400/25 bg-indigo-500/30 text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            }
          >
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
          <p className={confirmado ? "truncate text-base font-semibold text-white/30" : "truncate text-base font-semibold text-neutral-100"}>
            {reserva.cliente_nome ?? "Cliente"}
          </p>

          {reserva.cliente_instagram_username && (
            <a
              href={`https://instagram.com/${reserva.cliente_instagram_username}`}
              target="_blank"
              rel="noreferrer"
              className={
                confirmado
                  ? "mt-1 flex items-center gap-1.5 text-sm text-white/20"
                  : "mt-1 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300"
              }
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
              className={
                confirmado
                  ? "mt-1 flex items-center gap-1.5 text-sm text-white/20"
                  : "mt-1 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300"
              }
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
        <div
          className={
            confirmado
              ? "relative flex shrink-0 min-w-[76px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              : "relative flex shrink-0 min-w-[76px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-4 py-3 before:absolute before:inset-x-[15%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-['']"
          }
        >
          <span className={confirmado ? "text-lg font-semibold leading-none text-white/30" : "text-lg font-semibold leading-none text-neutral-100"}>
            {reserva.quantidade_pessoas ?? "—"}
          </span>
          <span className={confirmado ? "flex items-center gap-1 text-[10px] font-medium text-white/20" : "flex items-center gap-1 text-[10px] font-medium text-neutral-500"}>
            <Icone path={CAMINHO_PESSOAS} className={confirmado ? "h-3 w-3 text-white/20" : "h-3 w-3 text-indigo-400"} />
            pessoas
          </span>
        </div>
      </div>

      {/* Editar/Excluir à esquerda (só ícone, discretos), "Reservado em" centralizado em duas
          linhas no meio, e Confirmar/Chegou à direita — alinhado bem embaixo do bloco de pessoas
          ali em cima, mesmo vidro índigo dele. */}
      <div
        className={
          confirmado
            ? "mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3"
            : "mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3"
        }
      >
        <div className="flex items-center gap-1.5">
          <FormularioDeEdicaoDeReserva
            action={`/api/reservas/${reserva.id}/editar`}
            redirectTo={hrefAtualizar}
            nomeCliente={reserva.cliente_nome ?? "esse cliente"}
            quantidadeAtual={reserva.quantidade_pessoas ?? 1}
            apagado={confirmado}
          />
          <BotaoExcluirReserva
            action={`/api/reservas/${reserva.id}/excluir`}
            redirectTo={hrefAtualizar}
            nomeCliente={reserva.cliente_nome ?? "esse cliente"}
            apagado={confirmado}
          />
        </div>

        <div className="flex flex-col items-center text-center leading-tight">
          <span className={confirmado ? "text-[8px] uppercase tracking-wide text-white/15" : "text-[8px] uppercase tracking-wide text-neutral-600"}>
            Reservado em
          </span>
          <span className={confirmado ? "mt-0.5 text-[10px] text-white/25" : "mt-0.5 text-[10px] text-neutral-500"}>
            {formatarDataCurta(reserva.confirmado_em)} às {formatarHora(reserva.confirmado_em)}
          </span>
        </div>

        <BotaoConfirmarPresenca
          action={`/api/reservas/${reserva.id}/confirmar-presenca`}
          redirectTo={hrefAtualizar}
          nomeCliente={reserva.cliente_nome ?? "esse cliente"}
          presencaConfirmada={confirmado}
        />
      </div>
    </div>
  );
}

/** Capacidade máxima configurável separada por período (ver /contas/[id]/reserva) — "jantar" cai
 * de volta pro valor de "almoco" quando a conta ainda não configurou um específico pra ele, pra
 * ninguém perder a capacidade que já tinha antes dessa separação existir. */
export type LimitesPorPeriodo = { almoco: number | null; jantar: number | null };

export function CartaoDePeriodo({
  periodo,
  reservas,
  limites,
  hrefAtualizar,
}: {
  periodo: string;
  reservas: Reserva[];
  limites: LimitesPorPeriodo;
  hrefAtualizar: string;
}) {
  const limiteMaximo = periodo === "jantar" ? limites.jantar : limites.almoco;
  const totalDePessoasDoGrupo = reservas.reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  const percentual =
    typeof limiteMaximo === "number" && limiteMaximo > 0
      ? Math.min(100, Math.round((totalDePessoasDoGrupo / limiteMaximo) * 100))
      : null;
  // Azul (mesmo tom dos botões/destaques da tela) pra ocupação tranquila; amber e vermelho
  // continuam de aviso mesmo, pra não perder o sinal de "atenção" quando a capacidade aperta. Sem
  // caixa/borda própria (isso virou uma seção dentro do cartão do dia, não um cartão à parte) — o
  // sinal de status agora é só a cor da barra + do texto de "X/Y pessoas". `borda`/`brilho` tingem
  // o trilho (border + glow por fora) na MESMA cor do preenchimento — em vez de uma borda branca
  // genérica, fica com cara de tubo de vidro colorido pela própria "lotação" de dentro, não só
  // uma barra lisa com uma linha em volta.
  const status =
    percentual === null
      ? { barra: "bg-neutral-600", texto: "text-neutral-400", borda: "border-neutral-500/30", brilho: "" }
      : percentual >= 100
        ? {
            barra: "bg-red-500",
            texto: "text-red-400",
            borda: "border-red-500/50",
            brilho: "shadow-[0_0_12px_-2px_rgba(239,68,68,0.55)]",
          }
        : percentual >= 70
          ? {
              barra: "bg-amber-500",
              texto: "text-amber-400",
              borda: "border-amber-500/50",
              brilho: "shadow-[0_0_12px_-2px_rgba(245,158,11,0.55)]",
            }
          : {
              barra: "bg-indigo-500",
              texto: "text-indigo-400",
              borda: "border-indigo-500/50",
              brilho: "shadow-[0_0_12px_-2px_rgba(99,102,241,0.55)]",
            };
  const estiloPeriodo = estiloDoPeriodo(periodo);

  return (
    <div className="px-3 py-4">
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

      {/* Trilho translúcido (branco, não cinza sólido) — contra o fundo de vidro do card do dia,
          o cinza escuro de antes quase sumia de tão parecido com o fundo. Mais alto que antes só
          pra caber o texto da lotação centralizado dentro dele, bem discreto (fonte pequena, sem
          gritar) em vez de escrito solto do lado de fora. Borda + brilho por fora na cor do
          `status` (não branco genérico — sem blur próprio, o card do dia por fora já borra o
          fundo de verdade, ver comentário em CartaoDeReserva sobre esse mesmo cuidado) + um
          reflexo interno bem sutil no topo, pra ficar com cara de tubo de vidro de verdade em vez
          de só uma barra lisa com uma linha em volta. */}
      {percentual !== null && (
        <div
          className={`relative mt-3 h-5 w-full overflow-hidden rounded-full border-2 bg-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.18),inset_0_-1px_2px_rgba(0,0,0,0.3)] ${status.borda} ${status.brilho}`}
        >
          <div className={`h-full rounded-full ${status.barra}`} style={{ width: `${percentual}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-neutral-300">
            Lotação em {percentual}%
          </span>
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
