import { cookies, headers } from "next/headers";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  NOME_DO_COOKIE_DE_SESSAO,
  NOME_DO_HEADER_DE_CARIMBO,
  lerCarimboDeVerificacao,
} from "@/lib/funcionarios-cookie";
import { buscarFotoDePerfilDoCliente, buscarFotoDePerfilPorUsername } from "@/lib/metaMessaging";
import { buscarFotoDePerfilPelaApiDaSendPulse } from "@/lib/sendpulseApi";
import { hojeEmSaoPauloISO, somarDiasISO } from "@/lib/datas";
import { BotaoSair } from "@/app/contas/BotaoSair";
import { SeletorDeConta } from "./SeletorDeConta";
import { DiaComCarregamentoSobDemanda } from "./DiaComCarregamentoSobDemanda";
import { HistoricoSobDemanda } from "./HistoricoSobDemanda";
import { NotificacoesPush } from "./NotificacoesPush";
import {
  type Reserva,
  Icone,
  CAMINHO_PESSOAS,
  CAMINHO_TICKET,
  CartaoDePeriodo,
  CLASSE_CARTAO_DO_DIA,
} from "./reservasCompartilhado";

type FiltroDePeriodo = "todos" | "almoco" | "jantar";

export type ModoDaTelaDeReservas = "hoje" | "antigas" | "futuras";

const CAMINHO_DA_PAGINA: Record<ModoDaTelaDeReservas, string> = {
  hoje: "/reservas",
  antigas: "/reservas/antigas",
  futuras: "/reservas/futuras",
};

const TITULO_DA_PAGINA: Record<ModoDaTelaDeReservas, string> = {
  hoje: "Reservas",
  antigas: "Reservas antigas",
  futuras: "Reservas futuras",
};

// --- Ícones (mesmo estilo de traço já usado no botão de sair e no link de WhatsApp) — os que só
// são usados nesta tela (fora dos cartões de reserva, que moraram pra reservasCompartilhado.tsx). ---

const CAMINHO_CALENDARIO = "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z";
const CAMINHO_FUNIL = "M22 3H2l8 9.46V19l4 2v-8.54L22 3z";
const CAMINHO_SETA_ESQUERDA = "M19 12H5M12 19l-7-7 7-7";
const CAMINHO_SETA_DIREITA = "M5 12h14M12 5l7 7-7 7";
const CAMINHO_ATUALIZAR = "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15";
const CAMINHO_SETA_BAIXO = "M6 9l6 6 6-6";

// --- Datas ---

function diferencaEmDias(dataISO: string, referenciaISO: string): number {
  const [a1, a2, a3] = dataISO.split("-").map(Number);
  const [b1, b2, b3] = referenciaISO.split("-").map(Number);
  const diferencaMs = Date.UTC(a1, a2 - 1, a3) - Date.UTC(b1, b2 - 1, b3);
  return Math.round(diferencaMs / 86_400_000);
}

function primeiraLetraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataExtensa(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map((v) => parseInt(v, 10));
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
  return primeiraLetraMaiuscula(formatado);
}

/** Além da conta, devolve o usuário do funcionário logado — usado no cabeçalho da tela pra
 * mostrar discretamente "quem está vendo" (só relevante quando é sessão de funcionário; o Victor
 * já sabe que é ele mesmo). */
async function resolverContaDoFuncionario(
  admin: ReturnType<typeof criarClienteAdmin>
): Promise<{
  conta: { id: string; page_name: string; instagram_username: string | null };
  usuario: string;
} | null> {
  const token = cookies().get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  if (!token) return null;

  // Caminho rápido: o middleware já validou a sessão (de verdade, no banco, ou via carimbo de
  // confiança — ver funcionarios-cookie.ts) e repassou o resultado por header. Evita essa página
  // consultar o banco de NOVO só pra saber a mesma coisa que o middleware acabou de descobrir.
  const carimbo = await lerCarimboDeVerificacao(
    headers().get(NOME_DO_HEADER_DE_CARIMBO) ?? undefined,
    token,
    process.env.FUNCIONARIO_SESSAO_SECRET
  );
  if (carimbo) {
    return {
      conta: { id: carimbo.contaId, page_name: carimbo.pageName, instagram_username: carimbo.username },
      usuario: carimbo.usuario,
    };
  }

  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select(
      "funcionario_id, chatbot_funcionarios(usuario, account_id, chatbot_accounts(id, page_name, instagram_username))"
    )
    .eq("token", token)
    .maybeSingle();

  const funcionario = (sessao as any)?.chatbot_funcionarios;
  const conta = funcionario?.chatbot_accounts;
  if (!conta) return null;

  return {
    conta: { id: conta.id, page_name: conta.page_name, instagram_username: conta.instagram_username },
    usuario: funcionario.usuario,
  };
}

// "Futuras" não tem teto: uma data bem distante no lugar de um "até" de verdade, pra continuar
// usando o mesmo filtro `.lte("data_reserva", ate)` da consulta sem precisar de um caminho
// separado só pra esse caso. "Antigas" continua limitada aos últimos 30 dias.
const SEM_LIMITE_FUTURO = "9999-12-31";

function calcularIntervaloPadrao(modo: ModoDaTelaDeReservas, hoje: string): { de: string; ate: string } {
  if (modo === "antigas") return { de: somarDiasISO(hoje, -30), ate: somarDiasISO(hoje, -1) };
  if (modo === "futuras") return { de: somarDiasISO(hoje, 1), ate: SEM_LIMITE_FUTURO };
  return { de: hoje, ate: hoje };
}

export async function PainelDeReservas({
  searchParams,
  modo,
}: {
  searchParams: { conta?: string; de?: string; ate?: string; periodo?: string; busca?: string };
  modo: ModoDaTelaDeReservas;
}) {
  const admin = criarClienteAdmin();

  const infoDoFuncionario = await resolverContaDoFuncionario(admin);
  const ehFuncionario = infoDoFuncionario !== null;

  // "Conta pausada corta o acesso da equipe" é conferido no middleware agora (carimbo curto de
  // ~45s + consulta leve só de "active" quando ele vence — ver src/middleware.ts e
  // funcionarios-cookie.ts), não mais aqui. Achamos um bug sério nessa versão anterior: ela
  // consultava o banco de NOVO em toda navegação (lenta) e, pior, qualquer falha passageira nessa
  // consulta (rede, timeout) derrubava a pessoa pro login na hora — parecia estar "deslogando
  // sozinho" sem motivo. O middleware falha aberto (deixa continuar) numa falha assim, em vez de
  // barrar por engano.
  const { data: todasAsContasBrutas } = ehFuncionario
    ? { data: null }
    : await admin
        .from("chatbot_accounts")
        .select("id, page_name, instagram_username")
        .order("created_at", { ascending: true });

  // Só entra no dropdown (e pode virar a conta selecionada) quem tem reservas habilitadas — nem
  // toda página conectada usa essa função (botão "Ativar/desativar reservas" em /contas). O
  // funcionário nem passa por aqui: a conta dele já vem fixa via resolverContaDoFuncionario.
  let todasAsContas = todasAsContasBrutas;
  if (todasAsContasBrutas && todasAsContasBrutas.length > 0) {
    const { data: configs } = await admin
      .from("chatbot_account_settings")
      .select("account_id, reserva_habilitada")
      .in(
        "account_id",
        todasAsContasBrutas.map((c) => c.id)
      );
    const habilitadas = new Set((configs ?? []).filter((c) => c.reserva_habilitada).map((c) => c.account_id));
    todasAsContas = todasAsContasBrutas.filter((c) => habilitadas.has(c.id));
  }

  const contaSelecionada = ehFuncionario
    ? infoDoFuncionario!.conta
    : (todasAsContas ?? []).find((c) => c.id === searchParams.conta) ?? (todasAsContas ?? [])[0] ?? null;

  const hoje = hojeEmSaoPauloISO();
  const intervaloPadrao = calcularIntervaloPadrao(modo, hoje);
  const de = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.de ?? "") ? searchParams.de! : intervaloPadrao.de;
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.ate ?? "") ? searchParams.ate! : intervaloPadrao.ate;
  const filtroDePeriodo: FiltroDePeriodo = ["todos", "almoco", "jantar"].includes(searchParams.periodo ?? "")
    ? (searchParams.periodo as FiltroDePeriodo)
    : "todos";
  const busca = searchParams.busca?.trim() ?? "";

  let reservas: Reserva[] = [];
  const contagemPorDia = new Map<string, number>();
  let limiteMaximo: number | null = null;
  if (contaSelecionada) {
    // A busca de reservas (pesada em "hoje", leve nas outras telas) e o limite de capacidade não
    // dependem uma da outra — rodam ao mesmo tempo em vez de uma esperar a outra terminar. O
    // histórico/totais do ano saiu daqui de vez: agora é buscado sob demanda só quando a pessoa
    // abre aquele bloco (ver HistoricoSobDemanda.tsx + /api/reservas/historico).
    const consultaLimite = admin
      .from("chatbot_account_settings")
      .select("reserva_limite_maximo")
      .eq("account_id", contaSelecionada.id)
      .maybeSingle();

    if (modo === "hoje") {
      // Tela inicial: continua carregando tudo de cara (o intervalo aqui é sempre pequeno — o dia
      // de hoje, ou um período customizado curto que o próprio Victor escolheu no filtro).
      let consulta = admin
        .from("chatbot_reservations")
        .select(
          "id, instagram_scoped_id, cliente_nome, cliente_instagram_username, data_reserva, periodo, quantidade_pessoas, whatsapp, confirmado_em"
        )
        .eq("account_id", contaSelecionada.id)
        .gte("data_reserva", de)
        .lte("data_reserva", ate)
        .order("data_reserva", { ascending: true })
        .order("periodo", { ascending: true })
        .order("confirmado_em", { ascending: true });

      if (filtroDePeriodo !== "todos") {
        consulta = consulta.eq("periodo", filtroDePeriodo);
      }
      if (busca) {
        // Tira vírgula e parênteses — o filtro `.or()` do PostgREST usa esses caracteres como
        // separador de condição, então sem isso um nome de cliente com vírgula quebraria a busca.
        const buscaSegura = busca.replace(/[,()]/g, "");
        if (buscaSegura) {
          consulta = consulta.or(
            `cliente_nome.ilike.%${buscaSegura}%,cliente_instagram_username.ilike.%${buscaSegura}%`
          );
        }
      }

      const consultaToken = admin
        .from("chatbot_accounts")
        .select("access_token, instagram_user_id")
        .eq("id", contaSelecionada.id)
        .maybeSingle();

      const [{ data }, { data: config }, { data: contaComToken }] = await Promise.all([
        consulta,
        consultaLimite,
        consultaToken,
      ]);
      reservas = data ?? [];
      limiteMaximo = config?.reserva_limite_maximo ?? null;

      // Só nessa tela ("hoje", volume baixo — em média 3 a 5 reservas por dia, no máximo umas 20):
      // busca a foto de perfil de verdade de cada cliente, ao vivo, sem guardar no banco. Uma
      // chamada por @usuário único (não por reserva) pra não repetir à toa se a mesma pessoa tiver
      // mais de uma reserva no dia.
      //
      // `instagram_scoped_id` vem em 3 formatos diferentes dependendo de como a reserva chegou:
      // um IGSID de verdade da Meta (webhook direto), `sendpulse:<id>` (pela ponte — hoje é
      // praticamente todo mundo, enquanto o App Review não sai, então a Graph API da Meta NUNCA
      // teria a foto desse ID) ou `manual:...` (reserva antiga migrada à mão, sem foto nenhuma pra
      // buscar). Cada um busca no lugar certo.
      if (reservas.length > 0) {
        const idsUnicos = Array.from(new Set(reservas.map((r) => r.instagram_scoped_id)));
        // Pra fallback por @usuário (ver abaixo): pega o primeiro @usuário salvo pra cada id único.
        const usernamePorId = new Map<string, string | null>();
        for (const r of reservas) {
          if (!usernamePorId.has(r.instagram_scoped_id)) {
            usernamePorId.set(r.instagram_scoped_id, r.cliente_instagram_username ?? null);
          }
        }

        const fotosPorId = new Map<string, string | null>(
          await Promise.all(
            idsUnicos.map(async (id) => {
              if (id.startsWith("manual:")) return [id, null] as const;
              if (id.startsWith("sendpulse:")) {
                const contatoId = id.slice("sendpulse:".length);
                const fotoPelaSendPulse = await buscarFotoDePerfilPelaApiDaSendPulse(contatoId);
                if (fotoPelaSendPulse) return [id, fotoPelaSendPulse] as const;

                // Contato pode ter sido apagado no painel da SendPulse (ex.: limpeza manual) — nesse
                // caso a busca acima sempre falha, mesmo a reserva sendo antiga e válida. Com o
                // @usuário já salvo na reserva, tenta achar a foto direto pela Graph API (Business
                // Discovery), sem depender da SendPulse ter esse contato vivo.
                const username = usernamePorId.get(id);
                if (username && contaComToken?.access_token && contaComToken.instagram_user_id) {
                  return [
                    id,
                    await buscarFotoDePerfilPorUsername(
                      contaComToken.access_token,
                      contaComToken.instagram_user_id,
                      username
                    ),
                  ] as const;
                }
                return [id, null] as const;
              }
              if (!contaComToken?.access_token) return [id, null] as const;
              return [id, await buscarFotoDePerfilDoCliente(contaComToken.access_token, id)] as const;
            })
          )
        );
        reservas = reservas.map((r) => ({ ...r, fotoDePerfilUrl: fotosPorId.get(r.instagram_scoped_id) ?? null }));
      }
    } else {
      // Antigas/Futuras: intervalo pode ser grande (30 dias pra trás, ou todas as reservas
      // futuras sem teto) — busca só o suficiente pra montar o cabeçalho de cada dia (contagem),
      // sem os dados completos de cada reserva. O detalhe de um dia só é buscado (via
      // /api/reservas/dia) quando a pessoa abre o dropdown daquele dia, ver
      // DiaComCarregamentoSobDemanda.tsx.
      let consultaLeve = admin
        .from("chatbot_reservations")
        .select("data_reserva")
        .eq("account_id", contaSelecionada.id)
        .gte("data_reserva", de)
        .lte("data_reserva", ate);

      if (filtroDePeriodo !== "todos") {
        consultaLeve = consultaLeve.eq("periodo", filtroDePeriodo);
      }
      if (busca) {
        const buscaSegura = busca.replace(/[,()]/g, "");
        if (buscaSegura) {
          consultaLeve = consultaLeve.or(
            `cliente_nome.ilike.%${buscaSegura}%,cliente_instagram_username.ilike.%${buscaSegura}%`
          );
        }
      }

      const [{ data: leve }, { data: config }] = await Promise.all([consultaLeve, consultaLimite]);
      for (const linha of leve ?? []) {
        contagemPorDia.set(linha.data_reserva, (contagemPorDia.get(linha.data_reserva) ?? 0) + 1);
      }
      limiteMaximo = config?.reserva_limite_maximo ?? null;
    }
  }

  const porData = new Map<string, Map<string, Reserva[]>>();
  if (modo === "hoje") {
    for (const reserva of reservas) {
      const grupoDeData = porData.get(reserva.data_reserva) ?? new Map<string, Reserva[]>();
      const chaveDePeriodo = reserva.periodo ?? "sem_periodo";
      const grupoDePeriodo = grupoDeData.get(chaveDePeriodo) ?? [];
      grupoDePeriodo.push(reserva);
      grupoDeData.set(chaveDePeriodo, grupoDePeriodo);
      porData.set(reserva.data_reserva, grupoDeData);
    }
  }
  const datasOrdenadas = modo === "hoje" ? Array.from(porData.keys()).sort() : Array.from(contagemPorDia.keys()).sort();

  const totalDeReservas = reservas.length;
  const totalDePessoas = reservas.reduce((soma, r) => soma + (r.quantidade_pessoas ?? 0), 0);
  const ehSomenteHoje = modo === "hoje" && de === hoje && ate === hoje;
  const rotuloDoEscopo = ehSomenteHoje ? "hoje" : "no período";

  function href(sobrescreve: Partial<{ conta: string; de: string; ate: string; periodo: string; busca: string }>) {
    const params = new URLSearchParams();
    const contaAtual = sobrescreve.conta ?? contaSelecionada?.id;
    if (contaAtual) params.set("conta", contaAtual);
    params.set("de", sobrescreve.de ?? de);
    params.set("ate", sobrescreve.ate ?? ate);
    params.set("periodo", sobrescreve.periodo ?? filtroDePeriodo);
    const buscaFinal = sobrescreve.busca ?? busca;
    if (buscaFinal) params.set("busca", buscaFinal);
    return `${CAMINHO_DA_PAGINA[modo]}?${params.toString()}`;
  }

  /** Link pra outra tela (Hoje/Antigas/Futuras/Voltar) — sempre um começo limpo nessa tela (sem
   * herdar data/período/busca da tela atual), só carregando qual conta está selecionada. */
  function hrefDaTela(destino: ModoDaTelaDeReservas): string {
    if (ehFuncionario || !contaSelecionada) return CAMINHO_DA_PAGINA[destino];
    return `${CAMINHO_DA_PAGINA[destino]}?conta=${contaSelecionada.id}`;
  }

  const hrefAtualizar = href({});
  const filtroPersonalizadoAtivo = !ehSomenteHoje || busca.length > 0;

  // Lista longa de dias vira acordeão, uma dropdown por data, pra não precisar rolar por tudo
  // aberto de uma vez. Só na tela inicial ("hoje") o dia mais perto de hoje já vem expandido; nas
  // telas dedicadas de Antigas/Futuras todos ficam fechados por padrão — são só listas de
  // referência, não algo que se espera abrir tudo de cara.
  const usarAcordeaoDeDatas = modo === "hoje" ? datasOrdenadas.length > 1 : datasOrdenadas.length > 0;
  const dataParaAbrirPorPadrao =
    modo === "hoje"
      ? datasOrdenadas.reduce(
          (maisProxima: string | null, atual) =>
            maisProxima === null ||
            Math.abs(diferencaEmDias(atual, hoje)) < Math.abs(diferencaEmDias(maisProxima, hoje))
              ? atual
              : maisProxima,
          null
        )
      : null;

  return (
    // Menos margem lateral no celular (16px, o mínimo razoável antes de colar na borda) — 24px de
    // cada lado tirava muito espaço útil numa tela de ~390px. Só em telas maiores (tablet/desktop)
    // volta pra 24px, onde sobra espaço de sobra.
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Liquid Glass: brilhos suaves e desfocados atrás de tudo, fixos na tela (não rolam com o
          conteúdo) — é o que dá aos painéis translúcidos (backdrop-blur) algo pra refratar. Sem
          eles, o desfoque não teria nenhum efeito visível contra um fundo liso. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-indigo-600 opacity-[0.14] blur-[100px]" />
        <div className="absolute -right-40 top-40 h-80 w-80 rounded-full bg-violet-600 opacity-[0.14] blur-[100px]" />
        <div className="absolute -left-32 bottom-16 h-72 w-72 rounded-full bg-amber-500 opacity-[0.10] blur-[100px]" />
      </div>

      {/* Só o Victor (não o funcionário, que não tem acesso a mais nada além de /reservas) volta
          pro painel de contas a partir daqui — trocar entre Hoje/Antigas/Futuras agora é sempre
          pelas abas logo abaixo, então não precisa mais de um link de "Voltar" separado pra isso. */}
      {modo === "hoje" && !ehFuncionario && (
        <a
          href="/contas"
          className="mb-4 flex w-fit items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <Icone path={CAMINHO_SETA_ESQUERDA} className="h-4 w-4" />
          Voltar
        </a>
      )}

      <div className="animate-entrada flex items-start justify-between gap-4 motion-reduce:animate-none">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-100">
            <Icone path={CAMINHO_TICKET} className="h-5 w-5 text-indigo-400" />
            {TITULO_DA_PAGINA[modo]}
          </h1>
          {/* A data já aparece no cabeçalho do cartão do dia logo abaixo — repetir aqui também
              (como era antes) só duplicava a mesma informação duas vezes na tela. */}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-neutral-400">
            <span>{contaSelecionada ? contaSelecionada.page_name : "Nenhuma conta disponível"}</span>
            {/* Usuário logado — só pro funcionário (o Victor já sabe que é ele mesmo), bem
                discreto, só pra saber "quem" tá vendo essa tela num aparelho compartilhado. */}
            {ehFuncionario && infoDoFuncionario && (
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="text-neutral-700">·</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20.5c0-4.14 3.58-7.5 8-7.5s8 3.36 8 7.5" />
                </svg>
                {infoDoFuncionario.usuario}
              </span>
            )}
          </p>
        </div>

        {/* Filtros/Atualizar/Notificações moraram um tempo lá embaixo, meio soltos por cima da
            barra de abas — subiram pra cá, perto do Sair, onde as ações da tela toda ficam num
            lugar só. */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {contaSelecionada && (
            <>
              <details className="group relative">
                <summary
                  title="Filtros"
                  className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl [&::-webkit-details-marker]:hidden hover:border-white/20 hover:text-neutral-100"
                >
                  <Icone path={CAMINHO_FUNIL} className="h-3.5 w-3.5" />
                  {filtroPersonalizadoAtivo && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                </summary>

                <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 shadow-xl shadow-black/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Período</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        { valor: "todos", rotulo: "Almoço e jantar" },
                        { valor: "almoco", rotulo: "Só almoço" },
                        { valor: "jantar", rotulo: "Só jantar" },
                      ] as { valor: FiltroDePeriodo; rotulo: string }[]
                    ).map((filtro) => (
                      <a
                        key={filtro.valor}
                        href={href({ periodo: filtro.valor })}
                        className={`rounded-lg border px-2.5 py-1 text-xs ${
                          filtro.valor === filtroDePeriodo
                            ? "border-indigo-700 bg-indigo-950 text-indigo-200"
                            : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                        }`}
                      >
                        {filtro.rotulo}
                      </a>
                    ))}
                  </div>

                  <form method="GET" className="mt-4 flex flex-col gap-3 border-t border-neutral-800 pt-4">
                    {!ehFuncionario && <input type="hidden" name="conta" value={contaSelecionada.id} />}
                    <input type="hidden" name="periodo" value={filtroDePeriodo} />

                    <div>
                      <label className="text-xs text-neutral-500">Buscar por nome</label>
                      <input
                        type="text"
                        name="busca"
                        defaultValue={busca}
                        placeholder="Nome ou @usuário"
                        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500">De</label>
                        <input
                          type="date"
                          name="de"
                          defaultValue={de}
                          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500">Até</label>
                        <input
                          type="date"
                          name="ate"
                          placeholder="Sem limite"
                          defaultValue={ate === SEM_LIMITE_FUTURO ? "" : ate}
                          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-700 bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-950"
                    >
                      Aplicar filtros
                    </button>
                  </form>
                </div>
              </details>

              <a
                href={hrefAtualizar}
                title="Recarregar com os dados mais recentes"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 backdrop-blur-xl hover:border-white/20 hover:text-neutral-100"
              >
                <Icone path={CAMINHO_ATUALIZAR} className="h-3.5 w-3.5" />
              </a>

              {/* Só faz sentido na tela "hoje" — o numerozinho do ícone é sempre "reservas de hoje". */}
              {modo === "hoje" && <NotificacoesPush contaId={contaSelecionada.id} />}
            </>
          )}

          {ehFuncionario ? (
            <form action="/api/reservas/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
              >
                Sair
              </button>
            </form>
          ) : (
            <>
              <a
                href={contaSelecionada ? `/reservas/log?conta=${contaSelecionada.id}` : "/reservas/log"}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500"
              >
                Log de alterações
              </a>
              <BotaoSair />
            </>
          )}
        </div>
      </div>

      {/* Abas fixas Antigas/Hoje/Futuras — "Hoje" sempre no meio, é a tela de partida. Substitui
          o antigo link "Voltar" (nas telas de Antigas/Futuras) e o quadro de navegação que ficava
          mais abaixo, só na tela "hoje" — agora dá pra trocar de tela dali de qualquer uma das
          três, sempre no mesmo lugar. */}
      <div
        className="animate-entrada relative mt-4 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-lg motion-reduce:animate-none"
        style={{ animationDelay: "40ms" }}
      >
        {(["antigas", "hoje", "futuras"] as ModoDaTelaDeReservas[]).map((destino) => (
          <a
            key={destino}
            href={hrefDaTela(destino)}
            className={
              destino === modo
                ? "flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-white/15 to-white/5 px-3 py-2 text-sm font-semibold text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_14px_-6px_rgba(0,0,0,0.5)]"
                : "flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200"
            }
          >
            {/* Setinhas bem discretas indicando o sentido do tempo — pra trás nas antigas, pra
                frente nas futuras. "Hoje" no meio não precisa de nenhuma. */}
            {destino === "antigas" && <Icone path={CAMINHO_SETA_ESQUERDA} className="h-3 w-3 opacity-50" />}
            {destino === "antigas" ? "Antigas" : destino === "hoje" ? "Hoje" : "Futuras"}
            {destino === "futuras" && <Icone path={CAMINHO_SETA_DIREITA} className="h-3 w-3 opacity-50" />}
          </a>
        ))}
      </div>

      {!ehFuncionario && (todasAsContas ?? []).length > 1 && contaSelecionada && (
        <div className="mt-4">
          <SeletorDeConta
            contas={todasAsContas ?? []}
            contaSelecionadaId={contaSelecionada.id}
            hrefs={Object.fromEntries((todasAsContas ?? []).map((c) => [c.id, href({ conta: c.id })]))}
          />
        </div>
      )}

      {contaSelecionada && (
        <>
          {/* O resto (cards de estatística, histórico) só existe na tela inicial — Antigas/Futuras
              agora são telas dedicadas só à lista (a troca entre as três já é feita pelas abas lá
              em cima). */}
          {modo === "hoje" && (
            <>
              {/* As duas na mesma cor (índigo), com um degradê bem mais suave que antes — eram um
                  azul e um roxo brigando entre si e com o resto da tela. */}
              <div className="animate-entrada mt-4 grid grid-cols-2 gap-3 motion-reduce:animate-none" style={{ animationDelay: "80ms" }}>
                <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-4 py-3 backdrop-blur-xl shadow-[0_10px_24px_-14px_rgba(99,102,241,0.35)] before:absolute before:inset-x-[10%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-['']">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                    <Icone path={CAMINHO_TICKET} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Reservas {rotuloDoEscopo}</p>
                    <p className="text-2xl font-semibold text-neutral-50">{totalDeReservas}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-neutral-900 px-4 py-3 backdrop-blur-xl shadow-[0_10px_24px_-14px_rgba(99,102,241,0.35)] before:absolute before:inset-x-[10%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:content-['']">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                    <Icone path={CAMINHO_PESSOAS} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Pessoas {rotuloDoEscopo}</p>
                    <p className="text-2xl font-semibold text-neutral-50">{totalDePessoas}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!contaSelecionada && !ehFuncionario && (
        <p className="mt-8 text-sm text-neutral-500">
          Nenhuma conta com reservas ativadas ainda. Ative em "Ativar reservas", na tela de
          contas.
        </p>
      )}

      {contaSelecionada && datasOrdenadas.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
          Nenhuma reserva encontrada nesse filtro.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {datasOrdenadas.map((data, indiceDoDia) => {
          const totalDoDia =
            modo === "hoje"
              ? Array.from(porData.get(data)!.values()).reduce((soma, lista) => soma + lista.length, 0)
              : contagemPorDia.get(data) ?? 0;
          const abrirPorPadrao = data === dataParaAbrirPorPadrao;

          // Cabeçalho do dia com bem mais destaque — é a informação mais importante da tela. Numa
          // lista longa (Antigas/Futuras) vira o "summary" de um dropdown por data, com a
          // contagem de reservas visível mesmo fechado; numa lista curta (Hoje/Amanhã) fica
          // sempre aberto, sem esconder nada atrás de um clique à toa.
          //
          // Sem cantos/borda própria aqui de propósito — é só a faixa de topo de UM cartão só
          // (cabeçalho + períodos + reservas), não uma caixa separada flutuando em cima de outras
          // caixas (era exatamente essa sensação de "vários cartões soltos" que incomodava).
          // `rounded-t-2xl` aqui (em vez de `overflow-hidden` no cartão inteiro) é de propósito:
          // com só 1 reserva o cartão fica baixo, e a caixinha de "Editar" (que abre pra baixo)
          // precisava desse espaço — `overflow-hidden` no cartão cortava ela fora da tela sem
          // deixar nem editar nem cancelar.
          // Neutro sempre, sem selo "Hoje" — na tela inicial só existe UM dia mostrado por
          // padrão (hoje mesmo), então marcar "hoje" de novo aqui só duplicava o que já estava
          // óbvio pelo contexto.
          const cabecalhoDoDia = (
            <div
              className={`flex items-center gap-2.5 rounded-t-2xl border-b border-indigo-500/15 bg-indigo-500/5 px-4 py-3 ${
                usarAcordeaoDeDatas ? "cursor-pointer" : ""
              }`}
            >
              <Icone path={CAMINHO_CALENDARIO} className="h-5 w-5 shrink-0 text-neutral-500" />
              <span className="text-lg font-semibold text-neutral-100">{formatarDataExtensa(data)}</span>
              {usarAcordeaoDeDatas && (
                <>
                  <span className="ml-auto text-xs text-neutral-400">
                    {totalDoDia} reserva{totalDoDia === 1 ? "" : "s"}
                  </span>
                  <Icone
                    path={CAMINHO_SETA_BAIXO}
                    className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                  />
                </>
              )}
            </div>
          );

          // Antigas/Futuras: o corpo é um Client Component que só busca os dados completos desse
          // dia quando a pessoa abre o dropdown (ver DiaComCarregamentoSobDemanda.tsx) — em vez de
          // a página inteira já vir com o intervalo todo (30 dias antigos, ou todas as futuras sem
          // teto) carregado de cara.
          if (modo !== "hoje") {
            return (
              <DiaComCarregamentoSobDemanda
                key={data}
                cabecalho={cabecalhoDoDia}
                data={data}
                contaId={ehFuncionario ? null : contaSelecionada!.id}
                periodo={filtroDePeriodo}
                busca={busca}
                limiteMaximo={limiteMaximo}
                hrefAtualizar={hrefAtualizar}
              />
            );
          }

          // Tela "hoje": os dados já vieram todos prontos do servidor — renderiza direto.
          const grupoDeData = porData.get(data)!;
          const periodosOrdenados = Array.from(grupoDeData.keys()).sort();

          const corpoDoDia = (
            <div className="divide-y divide-neutral-800">
              {periodosOrdenados.map((periodo) => (
                <CartaoDePeriodo
                  key={periodo}
                  periodo={periodo}
                  reservas={grupoDeData.get(periodo)!}
                  limiteMaximo={limiteMaximo}
                  hrefAtualizar={hrefAtualizar}
                />
              ))}
            </div>
          );

          // Cabeçalho e períodos moram dentro de UM cartão só (borda+cantos arredondados aqui,
          // não em cada pedaço interno) — classe compartilhada com Antigas/Futuras, ver
          // CLASSE_CARTAO_DO_DIA em reservasCompartilhado.tsx.
          const estiloDoCartaoDoDia = { animationDelay: `${Math.min(indiceDoDia * 60, 240)}ms` };

          return usarAcordeaoDeDatas ? (
            <details key={data} className={`group ${CLASSE_CARTAO_DO_DIA}`} style={estiloDoCartaoDoDia} open={abrirPorPadrao}>
              <summary className="list-none [&::-webkit-details-marker]:hidden">{cabecalhoDoDia}</summary>
              {corpoDoDia}
            </details>
          ) : (
            <div key={data} className={CLASSE_CARTAO_DO_DIA} style={estiloDoCartaoDoDia}>
              {cabecalhoDoDia}
              {corpoDoDia}
            </div>
          );
        })}
      </div>

      {contaSelecionada && modo === "hoje" && (
        <HistoricoSobDemanda contaId={ehFuncionario ? null : contaSelecionada.id} />
      )}
    </main>
  );
}
