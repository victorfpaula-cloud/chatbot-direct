import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarFotoDePerfilDaConta } from "@/lib/metaMessaging";
import { extrairCorPredominante } from "@/lib/corDoLogo";
import { AvatarConta } from "./AvatarConta";
import { BotaoAtualizar } from "./BotaoAtualizar";
import { BotaoSair } from "./BotaoSair";
import { ChavesDeServico } from "./ChavesDeServico";
import { AnelDeProgresso } from "./AnelDeProgresso";
import { MenuDeAcoesDaConta } from "./MenuDeAcoesDaConta";

export const dynamic = "force-dynamic";

// A foto de perfil de um restaurante quase nunca muda — não faz sentido pedir ela pra Meta em
// TODA abertura da tela. Só busca de novo (e regrava no banco) quando já faz mais de 24h da
// última vez, ou quando essa conta ainda nunca teve uma foto guardada.
const VALIDADE_DA_FOTO_MS = 24 * 60 * 60 * 1000;

type ContaComFoto = {
  id: string;
  access_token: string;
  instagram_user_id: string;
  foto_perfil_url: string | null;
  foto_perfil_atualizada_em: string | null;
};

async function atualizarFotosDePerfilVencidas(
  admin: ReturnType<typeof criarClienteAdmin>,
  contas: ContaComFoto[]
): Promise<Map<string, string | null>> {
  const agora = Date.now();
  const vencidas = contas.filter(
    (c) => !c.foto_perfil_atualizada_em || agora - new Date(c.foto_perfil_atualizada_em).getTime() > VALIDADE_DA_FOTO_MS
  );

  const fotosAtualizadas = new Map<string, string | null>();
  if (vencidas.length === 0) return fotosAtualizadas;

  const resultados = await Promise.all(
    vencidas.map(async (conta) => {
      // Se a busca falhar (Meta fora do ar, token expirado, etc.), mantém a última foto boa em
      // cache em vez de apagar ela — nunca queremos trocar uma foto que já funcionava por
      // "nenhuma foto" só por causa de uma falha passageira na API.
      const foto = (await buscarFotoDePerfilDaConta(conta.access_token, conta.instagram_user_id)) ?? conta.foto_perfil_url;
      // Cor do brilho de fundo da reserva externa (ver src/lib/corDoLogo.ts) — recalculada junto
      // com a foto, na mesma janela de 24h, pra nunca fazer uma chamada extra só por causa dela.
      const cor = foto ? await extrairCorPredominante(foto) : null;
      return { id: conta.id, foto, cor };
    })
  );

  await Promise.all(
    resultados.map(({ id, foto, cor }) =>
      admin
        .from("chatbot_accounts")
        .update({ foto_perfil_url: foto, foto_perfil_atualizada_em: new Date().toISOString(), cor_predominante_logo: cor })
        .eq("id", id)
    )
  );

  for (const { id, foto } of resultados) {
    fotosAtualizadas.set(id, foto);
  }
  return fotosAtualizadas;
}

const MENSAGENS_DE_ERRO: Record<string, string> = {
  parametros_faltando: "O Facebook não devolveu os dados esperados. Tenta conectar de novo.",
  state_invalido: "Essa tentativa de login expirou ou já foi usada. Tenta conectar de novo.",
  sem_paginas_com_instagram:
    "Nenhuma das suas Páginas do Facebook tem uma conta do Instagram profissional vinculada.",
  falha_na_conexao: "Deu um erro conectando com o Facebook. Tenta de novo em instantes.",
  escolha_invalida: "Não veio nenhuma conta selecionada.",
  conexao_expirada: "Essa conexão expirou. Começa de novo clicando em Adicionar conta.",
  pagina_nao_encontrada: "Essa conta não estava mais na lista. Tenta conectar de novo.",
  falha_ao_salvar_conta: "Deu um erro salvando a conta. Tenta de novo em instantes.",
  falha_ao_pausar: "Deu um erro pausando/reativando a conta. Tenta de novo em instantes.",
  falha_ao_excluir: "Deu um erro excluindo a conta. Tenta de novo em instantes.",
};

// Estilo de cada conta (avatar + brilho ao passar o mouse) — escolhido de forma estável a partir
// do id, então a mesma conta sempre cai no mesmo estilo. Cartão em si ficou num cinza mais claro
// (neutral-800) que a página (neutral-900) — antes era o contrário (cartão mais escuro que a
// página), que o Victor achou "muito preto" — assim os cartões ficam claramente destacados/
// "flutuando" sobre o fundo, em vez de se misturar com ele.
const ESTILOS_CONTA = [
  { avatar: "bg-emerald-950 text-emerald-300", brilho: "hover:shadow-emerald-950/50" },
  { avatar: "bg-sky-950 text-sky-300", brilho: "hover:shadow-sky-950/50" },
  { avatar: "bg-amber-950 text-amber-300", brilho: "hover:shadow-amber-950/50" },
  { avatar: "bg-fuchsia-950 text-fuchsia-300", brilho: "hover:shadow-fuchsia-950/50" },
  { avatar: "bg-rose-950 text-rose-300", brilho: "hover:shadow-rose-950/50" },
];

function estiloDaConta(id: string) {
  let soma = 0;
  for (const caractere of id) soma += caractere.charCodeAt(0);
  return ESTILOS_CONTA[soma % ESTILOS_CONTA.length];
}

// Cor da faixa no topo do cartão — agora é sobre STATUS, não mais sobre qual conta é: verde
// enquanto ativa e sem erro hoje, vermelha (com um pouco de vidro/brilho, não sólida) quando
// pausada, vermelha sólida quando ativa mas teve pelo menos um erro hoje (isso avisa de problema
// batendo o olho, antes mesmo de entrar na conta) — antes a pausada usava amarelo, destoando do
// resto do cartão (borda e badge já eram vermelhos pra esse mesmo estado).
function corDaFaixa(conta: { active: boolean }, stats: EstatisticaDoDia) {
  if (!conta.active) return "bg-red-500/50 shadow-[0_0_14px_2px_rgba(239,68,68,0.55)]";
  if (stats.erros > 0) return "bg-red-500";
  return "bg-indigo-500";
}

// Mesmo brilho de fora de sempre + um brilho vermelho por DENTRO só quando pausada — reforça
// visualmente que esse cartão pausado tem realmente algo pra resolver, sem precisar ler o texto.
// Tailwind exige underscore no lugar de espaço dentro de um valor arbitrário `[...]` — sem isso o
// próprio build já falha, então underscore aqui não é só estilo, é sintaxe.
function sombraDoCartao(ativo: boolean): string {
  const base = "0_18px_40px_-18px_rgba(0,0,0,0.55)";
  const brilhoDeTopo = "inset_0_1px_0_rgba(255,255,255,0.05)";
  if (ativo) return `shadow-[${brilhoDeTopo},${base}]`;
  return `shadow-[${brilhoDeTopo},inset_0_0_60px_-14px_rgba(239,68,68,0.45),${base}]`;
}

// Meia-noite de hoje, horário de São Paulo, convertida pra um instante UTC — usado como corte
// pra contar só os atendimentos de HOJE. Brasil não tem mais horário de verão desde 2019, então
// São Paulo é sempre UTC-3 fixo (meia-noite em SP = 03:00 UTC) — não precisa de biblioteca de
// fuso horário pra isso, só somar 3 horas.
function inicioDoDiaEmSaoPauloISO(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";

  const ano = parseInt(obter("year"), 10);
  const mes = parseInt(obter("month"), 10);
  const dia = parseInt(obter("day"), 10);

  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0)).toISOString();
}

type EstatisticaDoDia = { respondidas: number; erros: number };

// Dia da semana de hoje em São Paulo, no padrão ISO-8601 (1 = segunda ... 7 = domingo) — mesmo
// padrão da coluna schedule_slots.day_of_week no banco do Agendador de Stories (ver
// supabase/schema.sql do projeto agendador-stories). Brasil não tem mais horário de verão desde
// 2019, então São Paulo é sempre UTC-3 fixo.
function diaDaSemanaHojeEmSaoPaulo(): number {
  const abreviacao = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(
    new Date()
  );
  const mapa: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return mapa[abreviacao] ?? 1;
}

// Data de hoje em São Paulo, como "AAAA-MM-DD" — usada pra filtrar publish_log.scheduled_for
// (coluna `date`, sem hora) do Agendador de Stories.
function dataDeHojeEmSaoPauloISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

type ResumoDeStoriesHoje = { total: number; postados: number } | "nao_conectado";

// Resumo de hoje do Agendador de Stories (app separado, mas que vive no MESMO projeto Supabase —
// ver /api/contas/agendador-stories-status) pra cada conta com esse produto habilitado. Casando
// pelo instagram_user_id (= accounts.ig_user_id lá, mesmo ID real da conta do Instagram), sem
// tabela de mapeamento própria. "nao_conectado" cobre tanto quem nunca conectou lá quanto o caso
// (raro) de instagram_user_id não bater com nada.
async function buscarResumoDeStoriesHoje(
  admin: ReturnType<typeof criarClienteAdmin>,
  contasComStories: { id: string; instagram_user_id: string }[]
): Promise<Map<string, ResumoDeStoriesHoje>> {
  const resumo = new Map<string, ResumoDeStoriesHoje>();
  if (contasComStories.length === 0) return resumo;

  const idsDoInstagram = contasComStories.map((c) => c.instagram_user_id);
  const { data: contasStories } = await admin.from("accounts").select("id, ig_user_id").in("ig_user_id", idsDoInstagram);

  const storiesIdParaContaLocal = new Map<string, string>();
  for (const c of contasComStories) {
    const contaStories = (contasStories ?? []).find((cs) => cs.ig_user_id === c.instagram_user_id);
    if (contaStories) storiesIdParaContaLocal.set(contaStories.id, c.id);
    else resumo.set(c.id, "nao_conectado");
  }

  const idsDeStories = Array.from(storiesIdParaContaLocal.keys());
  if (idsDeStories.length === 0) return resumo;

  const diaHoje = diaDaSemanaHojeEmSaoPaulo();
  const dataHoje = dataDeHojeEmSaoPauloISO();

  const [{ data: horarios }, { data: publicacoes }] = await Promise.all([
    admin.from("schedule_slots").select("account_id").in("account_id", idsDeStories).eq("day_of_week", diaHoje).eq("is_active", true),
    admin.from("publish_log").select("account_id, status").in("account_id", idsDeStories).eq("scheduled_for", dataHoje),
  ]);

  const totalPorConta = new Map<string, number>();
  for (const h of horarios ?? []) {
    totalPorConta.set(h.account_id, (totalPorConta.get(h.account_id) ?? 0) + 1);
  }
  const postadosPorConta = new Map<string, number>();
  for (const p of publicacoes ?? []) {
    if (p.status === "success") postadosPorConta.set(p.account_id, (postadosPorConta.get(p.account_id) ?? 0) + 1);
  }

  for (const [storiesId, contaLocalId] of storiesIdParaContaLocal) {
    resumo.set(contaLocalId, {
      total: totalPorConta.get(storiesId) ?? 0,
      postados: postadosPorConta.get(storiesId) ?? 0,
    });
  }

  return resumo;
}

// Quantos Stories o AutoStory (novo sub-módulo do Agendador de Stories, lançado 17/09/2026 — lê
// uma pasta do Google Drive sozinho e publica, sem precisar cadastrar horário na mão) já publicou
// hoje, por conta — tabelas próprias (story_drive_config/story_posts), independentes de
// schedule_slots/publish_log usadas pelo Stories "normal" acima. undefined = conta sem AutoStory
// configurado lá (não mostra o ícone do robô nem pra quem não conectou, igual ao resumo de cima).
async function buscarResumoDeAutoStoryHoje(
  admin: ReturnType<typeof criarClienteAdmin>,
  contasComStories: { id: string; instagram_user_id: string }[]
): Promise<Map<string, number>> {
  const resumo = new Map<string, number>();
  if (contasComStories.length === 0) return resumo;

  const idsDoInstagram = contasComStories.map((c) => c.instagram_user_id);
  const { data: contasStories } = await admin.from("accounts").select("id, ig_user_id").in("ig_user_id", idsDoInstagram);

  const storiesIdParaContaLocal = new Map<string, string>();
  for (const c of contasComStories) {
    const contaStories = (contasStories ?? []).find((cs) => cs.ig_user_id === c.instagram_user_id);
    if (contaStories) storiesIdParaContaLocal.set(contaStories.id, c.id);
  }

  const idsDeStories = Array.from(storiesIdParaContaLocal.keys());
  if (idsDeStories.length === 0) return resumo;

  // Só conta pra quem realmente tem o AutoStory configurado lá — sem isso, toda conta com Stories
  // "normal" ganhava um robô mostrando "0" à toa, mesmo nunca tendo usado esse recurso novo.
  const { data: configsDeAutoStory } = await admin
    .from("story_drive_config")
    .select("account_id")
    .in("account_id", idsDeStories);

  const dataHoje = dataDeHojeEmSaoPauloISO();
  const inicioDoDiaUTC = new Date(`${dataHoje}T00:00:00-03:00`).toISOString();
  const fimDoDiaUTC = new Date(`${dataHoje}T23:59:59-03:00`).toISOString();

  const { data: storiesAutomaticosDeHoje } = await admin
    .from("story_posts")
    .select("account_id, status")
    .in("account_id", idsDeStories)
    .gte("scheduled_at", inicioDoDiaUTC)
    .lte("scheduled_at", fimDoDiaUTC);

  const postadosPorConta = new Map<string, number>();
  for (const s of storiesAutomaticosDeHoje ?? []) {
    if (s.status === "success") postadosPorConta.set(s.account_id, (postadosPorConta.get(s.account_id) ?? 0) + 1);
  }

  for (const { account_id: storiesId } of configsDeAutoStory ?? []) {
    const contaLocalId = storiesIdParaContaLocal.get(storiesId);
    if (contaLocalId) resumo.set(contaLocalId, postadosPorConta.get(storiesId) ?? 0);
  }

  return resumo;
}

export default async function ContasPage({
  searchParams,
}: {
  searchParams: { erro?: string; conectada?: string; aviso?: string; detalhe?: string; excluida?: string };
}) {
  const admin = criarClienteAdmin();
  const { data: contas } = await admin
    .from("chatbot_accounts")
    .select(
      "id, page_name, instagram_username, active, access_token, instagram_user_id, foto_perfil_url, foto_perfil_atualizada_em"
    )
    .order("created_at", { ascending: true });

  const idsDasContas = (contas ?? []).map((c) => c.id);

  // As duas buscas abaixo (estatísticas do dia e foto de perfil) são independentes entre si —
  // cada uma só precisa da lista de contas, nenhuma depende do resultado da outra. Antes
  // rodavam uma atrás da outra (cada uma esperando a anterior terminar); agora rodam ao mesmo
  // tempo, então o tempo total de espera vira "a mais lenta delas", não "a soma de todas".
  const [{ data: atendimentosDeHoje }, fotosAtualizadas, { data: configsDeServico }] = await Promise.all([
    idsDasContas.length > 0
      ? admin
          .from("chatbot_atendimentos")
          .select("account_id, instagram_scoped_id, status")
          .gte("criado_em", inicioDoDiaEmSaoPauloISO())
      : Promise.resolve({ data: [] as { account_id: string; instagram_scoped_id: string; status: string }[] }),
    atualizarFotosDePerfilVencidas(admin, contas ?? []),
    idsDasContas.length > 0
      ? admin
          .from("chatbot_account_settings")
          .select(
            "account_id, chatbot_direct_habilitado, reserva_habilitada, agendamento_habilitado, busca_automatica_habilitada, agendador_stories_habilitado"
          )
          .in("account_id", idsDasContas)
      : Promise.resolve({
          data: [] as {
            account_id: string;
            chatbot_direct_habilitado: boolean;
            reserva_habilitada: boolean;
            agendamento_habilitado: boolean;
            busca_automatica_habilitada: boolean;
            agendador_stories_habilitado: boolean;
          }[],
        }),
  ]);

  const servicosPorConta = new Map(
    (configsDeServico ?? []).map((c) => [
      c.account_id,
      {
        direct: c.chatbot_direct_habilitado,
        reserva: c.reserva_habilitada,
        agendamento: c.agendamento_habilitado,
        busca: c.busca_automatica_habilitada,
        stories: c.agendador_stories_habilitado,
      },
    ])
  );

  // Foto de perfil de cada conta — agora cacheada no banco (`chatbot_accounts.foto_perfil_url`) e
  // só buscada de novo na Meta quando estiver velha (ver atualizarFotosDePerfilVencidas), já que a
  // foto de um restaurante quase nunca muda. O access_token só é usado dentro do servidor pra
  // fazer essa busca — nunca é passado pro componente de cliente (AvatarConta só recebe a URL já
  // pronta).
  const fotosPorConta = new Map<string, string | null>();
  for (const conta of contas ?? []) {
    fotosPorConta.set(conta.id, fotosAtualizadas.get(conta.id) ?? conta.foto_perfil_url ?? null);
  }

  // Só busca resumo de Stories de hoje pras contas que realmente têm esse produto habilitado —
  // sem isso, toda abertura de /contas faria 3 consultas extras no banco do Agendador de Stories
  // à toa, mesmo pra quem nunca usa esse produto.
  const contasComStories = (contas ?? [])
    .filter((c) => servicosPorConta.get(c.id)?.stories)
    .map((c) => ({ id: c.id, instagram_user_id: c.instagram_user_id }));
  const [resumoDeStoriesPorConta, resumoDeAutoStoryPorConta] = await Promise.all([
    buscarResumoDeStoriesHoje(admin, contasComStories),
    buscarResumoDeAutoStoryHoje(admin, contasComStories),
  ]);

  // "Status do dia": conta rápida de quantos CLIENTES essa conta atendeu hoje e quantos tiveram
  // erro — só pra dar uma visão geral batendo o olho, sem precisar entrar em cada conta. Isso
  // roda só quando essa página é aberta (não é um relógio rodando toda hora em segundo plano —
  // essa tela já busca dado novo a cada abertura, então já vem sempre atualizado sozinho, sem
  // gastar nada além do que essa página já gasta hoje).
  //
  // Contado por CLIENTE (instagram_scoped_id), não por mensagem — um cliente que trocou várias
  // mensagens com o bot hoje conta como 1 só, igual já é agrupado na tela de Atendimentos de cada
  // conta. Um Set por conta garante que cada cliente só entra uma vez, mesmo respondido/com erro
  // várias vezes ao longo do dia.
  const estatisticasPorConta = new Map<string, EstatisticaDoDia>();
  if (contas && contas.length > 0) {
    const clientesRespondidosPorConta = new Map<string, Set<string>>();
    const clientesComErroPorConta = new Map<string, Set<string>>();

    for (const atendimento of atendimentosDeHoje ?? []) {
      if (atendimento.status === "erro") {
        const clientes = clientesComErroPorConta.get(atendimento.account_id) ?? new Set<string>();
        clientes.add(atendimento.instagram_scoped_id);
        clientesComErroPorConta.set(atendimento.account_id, clientes);
      } else if (atendimento.status === "respondido") {
        const clientes = clientesRespondidosPorConta.get(atendimento.account_id) ?? new Set<string>();
        clientes.add(atendimento.instagram_scoped_id);
        clientesRespondidosPorConta.set(atendimento.account_id, clientes);
      }
    }

    for (const conta of contas) {
      estatisticasPorConta.set(conta.id, {
        respondidas: clientesRespondidosPorConta.get(conta.id)?.size ?? 0,
        erros: clientesComErroPorConta.get(conta.id)?.size ?? 0,
      });
    }
  }

  const mensagemDeErro = searchParams.erro ? MENSAGENS_DE_ERRO[searchParams.erro] : null;
  const avisoFalhaWebhook = searchParams.aviso === "falha_ao_inscrever_webhook";

  return (
    // max-w cresce nos breakpoints maiores (tablet/desktop) — no celular já ficava bom do jeito
    // que era, mas no iPad e desktop sobrava muita borda vazia dos lados com só max-w-4xl fixo, e
    // os cards ficavam mais estreitos que precisavam (nome de conta comprida, tipo "Dona Baunilha
    // Doceria e Cafeteria Sorocaba", quebrava em 2 linhas apertadas à toa). Primeira tentativa
    // (indo até max-w-7xl) ficou grande demais/colado na borda no iPad — parou de crescer em
    // max-w-6xl e o padding lateral (px) também cresce por breakpoint, pra sobrar uma margem
    // visível em vez de esticar até quase encostar na tela.
    <main className="mx-auto max-w-4xl px-6 py-10 md:max-w-5xl md:px-10 lg:max-w-6xl lg:px-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Contas conectadas</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Atendimento automático de Instagram Direct — suas contas conectadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoAtualizar />
          <BotaoSair />
        </div>
      </div>

      {searchParams.conectada && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950 px-4 py-2 text-sm text-green-300">
          Conta conectada com sucesso.
        </div>
      )}

      {searchParams.excluida && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950 px-4 py-2 text-sm text-green-300">
          Conta excluída.
        </div>
      )}

      {mensagemDeErro && (
        <div className="mt-4 break-words rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {mensagemDeErro}
        </div>
      )}

      {avisoFalhaWebhook && (
        <div className="mt-4 rounded-lg border border-yellow-900 bg-yellow-950 px-4 py-2 text-sm text-yellow-300">
          <p>
            A conta foi conectada, mas não conseguimos inscrever ela pra receber mensagens (o
            Facebook recusou o pedido). Tenta conectar essa mesma conta de novo em instantes.
          </p>
          {searchParams.detalhe && (
            <p className="mt-2 break-words rounded-md bg-yellow-900/40 px-2 py-1 font-mono text-xs text-yellow-200">
              Motivo do Facebook: {searchParams.detalhe}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(contas ?? []).map((conta) => {
          const estilo = estiloDaConta(conta.id);
          const stats = estatisticasPorConta.get(conta.id) ?? { respondidas: 0, erros: 0 };
          const servicos = servicosPorConta.get(conta.id) ?? {
            direct: true,
            reserva: false,
            agendamento: false,
            busca: false,
            stories: false,
          };

          const fade = conta.active ? "" : "opacity-50";
          const resumoStories = resumoDeStoriesPorConta.get(conta.id);
          const postadosPeloAutoStory = resumoDeAutoStoryPorConta.get(conta.id);

          return (
            <div
              key={conta.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white/[0.05] pt-6 ${sombraDoCartao(conta.active)} transition-all [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] hover:-translate-y-0.5 hover:shadow-xl ${estilo.brilho} ${
                conta.active ? "border-white/15" : "border-red-500/30"
              }`}
            >
              {/* Faixa colorida no topo do cartão — índigo (cor principal) ativa, vermelha (vidro) pausada, vermelha sólida com erro hoje. */}
              <span className={`absolute inset-x-0 top-0 h-1 ${corDaFaixa(conta, stats)}`} />

              <div className="flex flex-col px-5 pb-5">
                {/* Faixa 1: cabeçalho — avatar, status, nome. Pausada: fica apagada (mesmo
                    espírito do cartão de reserva já confirmada, "sem vida") — só o rodapé, lá
                    embaixo, continua com destaque de verdade. */}
                <div className={fade}>
                  <div className="flex items-center justify-between">
                    <AvatarConta
                      fotoUrl={fotosPorConta.get(conta.id) ?? null}
                      letra={conta.page_name.charAt(0).toUpperCase()}
                      corDeFundo={estilo.avatar}
                      corDoAnel={conta.active ? "ring-neutral-700" : "ring-red-900"}
                    />

                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        conta.active
                          ? "border-green-900 bg-green-950 text-green-300"
                          : "border-red-900 bg-red-950 text-red-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          conta.active ? "animate-pulse bg-green-500" : "bg-red-500"
                        }`}
                      />
                      {conta.active ? "Ativa" : "Pausada"}
                    </span>
                  </div>

                  {/* Nome/@usuário levam direto pra Configurações gerais — atalho mais rápido
                      que sempre ter que descer até o botão do rodapé. min-h reserva o espaço de
                      2 linhas mesmo quando o nome cabe numa linha só, assim todo cartão fica com
                      a mesma altura, tenha nome curto ou comprido; se o nome for maior que 2
                      linhas, corta com "..." (line-clamp-2) em vez de esticar o cartão. */}
                  <a href={`/contas/${conta.id}/palavras-chave`} className="mt-4 block">
                    <p className="line-clamp-2 min-h-[2.5rem] font-medium leading-tight text-neutral-100 hover:text-white">
                      {conta.page_name}
                    </p>
                    <p className="text-sm text-neutral-500">@{conta.instagram_username}</p>
                  </a>
                </div>

                {/* Faixa 2: métricas de hoje, sempre duas caixinhas do MESMO tamanho lado a lado
                    — atendimentos e Stories — em vez do card crescer ou encolher dependendo de
                    quais produtos essa conta tem. Quando Stories não se aplica (desligado, ou
                    ligado mas ainda não conectado lá, ou sem horário nenhum hoje), a caixinha da
                    direita vira um placeholder tracejado do mesmo tamanho, nunca desaparece. */}
                <div className={`mt-3.5 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3.5 ${fade}`}>
                  <a
                    href={`/contas/${conta.id}/atendimentos`}
                    className="flex min-h-[64px] flex-col justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Atendimentos
                    </span>
                    <span className="text-base font-semibold text-neutral-100">{stats.respondidas} hoje</span>
                    {stats.erros > 0 && (
                      <span className="text-[11px] font-medium text-red-400">
                        {stats.erros} com erro
                      </span>
                    )}
                  </a>

                  {!servicos.stories ? (
                    <a
                      href={`/contas/${conta.id}/stories`}
                      className="flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-[11px] leading-snug text-neutral-600 transition hover:border-white/20 hover:text-neutral-500"
                    >
                      Stories não contratado
                    </a>
                  ) : resumoStories === "nao_conectado" ? (
                    <a
                      href={`/contas/${conta.id}/stories`}
                      className="flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-[11px] leading-snug text-neutral-600 transition hover:border-white/20 hover:text-neutral-500"
                    >
                      Ainda não conectado no Agendador de Stories
                    </a>
                  ) : !resumoStories || resumoStories.total === 0 ? (
                    <a
                      href={`/contas/${conta.id}/stories`}
                      className="flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-[11px] leading-snug text-neutral-600 transition hover:border-white/20 hover:text-neutral-500"
                    >
                      Nenhum Story hoje
                    </a>
                  ) : (
                    <a
                      href={`/contas/${conta.id}/stories`}
                      className="flex min-h-[64px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20"
                    >
                      <AnelDeProgresso pct={(resumoStories.postados / resumoStories.total) * 100} />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                          Stories hoje
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-base font-semibold text-neutral-100">
                            {resumoStories.postados}/{resumoStories.total}
                          </span>
                          {postadosPeloAutoStory !== undefined && (
                            <span
                              className="flex items-center gap-0.5 text-indigo-400"
                              title={`AutoStory publicou ${postadosPeloAutoStory} hoje`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                                aria-hidden="true"
                              >
                                <rect x="4" y="9" width="16" height="11" rx="3" />
                                <path d="M12 9V5" />
                                <circle cx="12" cy="3.5" r="1.2" fill="currentColor" stroke="none" />
                                <circle cx="9" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
                                <circle cx="15" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
                              </svg>
                              <span className="text-xs font-semibold">{postadosPeloAutoStory}</span>
                            </span>
                          )}
                        </span>
                      </span>
                    </a>
                  )}
                </div>

                {/* Faixa 3: produtos contratados. */}
                <div className={`mt-3.5 ${fade}`}>
                  <ChavesDeServico
                    contaId={conta.id}
                    directHabilitado={servicos.direct}
                    reservaHabilitada={servicos.reserva}
                    agendamentoHabilitado={servicos.agendamento}
                    buscaHabilitada={servicos.busca}
                    storiesHabilitado={servicos.stories}
                  />
                </div>

                {/* Faixa 4 (rodapé): FORA do wrapper apagado acima — continua com destaque de
                    verdade mesmo numa conta pausada. Reservas/Pausar/Excluir (ações menos usadas
                    no dia a dia, e que tinham alturas diferentes de cartão pra cartão) ficam
                    dentro do menu "⋯"; só "Configurações gerais" continua como botão sempre à
                    vista. */}
                <div className="mt-3.5 flex items-center gap-2 border-t border-white/10 pt-3.5">
                  <a
                    href={`/contas/${conta.id}/palavras-chave`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-medium text-neutral-300 hover:bg-white/10"
                  >
                    Configurações gerais
                  </a>
                  <MenuDeAcoesDaConta
                    contaId={conta.id}
                    ativo={conta.active}
                    reservaHabilitada={servicos.reserva}
                    storiesHabilitado={servicos.stories}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <a
          href="/api/auth/facebook/start"
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 p-5 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
        >
          <span className="mb-1 text-2xl leading-none">+</span>
          <span className="text-sm font-medium">Adicionar conta</span>
        </a>
      </div>

      {(contas ?? []).length === 0 && (
        <p className="mt-2 text-sm text-neutral-500">Nenhuma conta conectada ainda.</p>
      )}
    </main>
  );
}
