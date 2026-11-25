import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Módulo do cardápio digital. Tudo fica nas tabelas cardapio_* (ver supabase/cardapio.sql) e
// só é lido/escrito pelo servidor. Nada aqui toca em chatbot_* ou nas outras frentes.

export const TAGS_CARDAPIO = [
  "vegetariano",
  "vegano",
  "picante",
  "novidade",
  "destaque",
  "sem-gluten",
] as const;
export type TagCardapio = (typeof TAGS_CARDAPIO)[number];

export const ROTULOS_TAGS: Record<TagCardapio, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  picante: "Picante",
  novidade: "Novidade",
  destaque: "Destaque",
  "sem-gluten": "Sem glúten",
};

/** Fuso do restaurante: promoção e destaque vencem à meia-noite deste fuso. */
export const FUSO_CARDAPIO = "America/Sao_Paulo";

/** Prazos por tipo, em dias. Promoção do dia tem 2 dias; destaque não. */
export const PRAZOS: Record<"promo" | "destaque", Record<string, { dias: number; rotulo: string }>> = {
  promo: {
    "1d": { dias: 1, rotulo: "1 dia" },
    "2d": { dias: 2, rotulo: "2 dias" },
    "7d": { dias: 7, rotulo: "1 semana" },
    "30d": { dias: 30, rotulo: "1 mês" },
  },
  destaque: {
    "1d": { dias: 1, rotulo: "1 dia" },
    "7d": { dias: 7, rotulo: "1 semana" },
    "30d": { dias: 30, rotulo: "1 mês" },
  },
};

export type Conta = {
  account_id: string;
  habilitado: boolean;
  nome_exibicao: string;
  tagline: string;
  cor_destaque: string;
  /** Só o servidor usa (para saber se já há senha definida). Nunca vai para o cliente. */
  senha_dono_hash?: string | null;
};
export type Categoria = {
  id: string;
  nome: string;
  descricao: string;
  posicao: number;
  ativa: boolean;
  capa_url: string;
  /** lista = 1 coluna com cards; lista_elegante = lista de linhas com separador; duas_colunas = 2 colunas; grade = cards pequenos (2 no celular, 4 no computador). */
  layout: Layout;
};

export const LAYOUTS = ["lista", "lista_elegante", "duas_colunas", "grade"] as const;
export type Layout = (typeof LAYOUTS)[number];
export const ROTULO_LAYOUT: Record<Layout, string> = {
  lista: "1 coluna",
  lista_elegante: "Lista",
  duas_colunas: "2 colunas",
  grade: "Grade compacta (2 no celular, 4 no computador)",
};
export const layoutValido = (v: string | null | undefined): Layout =>
  (LAYOUTS as readonly string[]).includes(v ?? "") ? (v as Layout) : "lista";
export type Produto = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  preco_centavos: number;
  foto_url: string;
  tags: string[];
  disponivel: boolean;
  posicao: number;
};
export type Destaque = {
  id: string;
  produto_id: string;
  tipo: "promo" | "destaque";
  ate: string;
  preco_promocional_centavos: number | null;
};

export class ErroCardapio extends Error {}

const HORA = 60 * 60 * 1000;

/** Diferença (ms) entre o fuso informado e o UTC, num instante. */
function deslocamentoDoFuso(data: Date, fuso: string): number {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(data)
      .map((p) => [p.type, p.value])
  );
  const comoUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour),
    Number(partes.minute),
    Number(partes.second)
  );
  return comoUTC - (data.getTime() - data.getMilliseconds());
}

/**
 * Fim do período: meia-noite do dia seguinte ao último dia. 1 dia = meia-noite de hoje;
 * 2 dias = meia-noite de amanhã; e assim por diante. Conta no calendário do fuso do restaurante.
 */
export function fimDoPeriodo(dias: number, agora: Date = new Date(), fuso = FUSO_CARDAPIO): Date {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(agora)
      .map((p) => [p.type, p.value])
  );
  const meiaNoiteUTC = Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day) + dias);
  return new Date(meiaNoiteUTC - deslocamentoDoFuso(new Date(meiaNoiteUTC), fuso));
}

/** Converte "48,90", "48.90", "R$ 1.250,00" ou número em centavos. */
export function precoParaCentavos(valor: string): number {
  const limpo = valor.replace(/R\$|\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const reais = Number(limpo);
  if (!limpo || !Number.isFinite(reais) || reais < 0 || reais > 100000) {
    throw new ErroCardapio("Preço inválido. Use algo como 48,90.");
  }
  return Math.round(reais * 100);
}

const limpa = (v: FormDataEntryValue | null | undefined, max: number) =>
  String(v ?? "").trim().slice(0, max);

function corValida(cor: string) {
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor.toLowerCase() : "#e4572e";
}

export async function carregarConta(accountId: string): Promise<Conta | null> {
  const admin = criarClienteAdmin();
  const { data, error } = await admin
    .from("cardapio_contas")
    .select("account_id, habilitado, nome_exibicao, tagline, cor_destaque, senha_dono_hash")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data as Conta | null;
}

/** Tudo que o painel precisa, numa leitura só. */
export async function carregarCardapioDaConta(accountId: string) {
  const admin = criarClienteAdmin();
  const [conta, categorias, produtos, destaques] = await Promise.all([
    carregarConta(accountId),
    admin.from("cardapio_categorias").select("*").eq("account_id", accountId).order("posicao").order("criado_em"),
    admin.from("cardapio_produtos").select("*").eq("account_id", accountId).order("posicao").order("criado_em"),
    admin
      .from("cardapio_destaques")
      .select("*")
      .eq("account_id", accountId)
      .gt("ate", new Date().toISOString())
      .order("criado_em", { ascending: false }),
  ]);
  for (const r of [categorias, produtos, destaques]) if (r.error) throw r.error;
  return {
    conta,
    categorias: (categorias.data ?? []) as Categoria[],
    produtos: (produtos.data ?? []) as Produto[],
    destaques: (destaques.data ?? []) as Destaque[],
  };
}

/** Cardápio público por slug da conta. Só devolve se o cardápio estiver liberado. */
export async function carregarCardapioPublico(slug: string) {
  const admin = criarClienteAdmin();
  const { data: conta } = await admin
    .from("chatbot_accounts")
    .select("id, page_name")
    .eq("slug", slug)
    .maybeSingle();
  if (!conta) return null;

  const cardapio = await carregarCardapioDaConta(conta.id);
  if (!cardapio.conta?.habilitado) return null;

  const agora = Date.now();
  const produtoPorId = new Map(cardapio.produtos.map((p) => [p.id, p]));
  const categoriasAtivas = new Set(cardapio.categorias.filter((c) => c.ativa).map((c) => c.id));
  const destaquesVisiveis = cardapio.destaques
    .filter((d) => new Date(d.ate).getTime() > agora)
    .filter((d) => {
      const p = produtoPorId.get(d.produto_id);
      return p && p.disponivel && categoriasAtivas.has(p.categoria_id);
    });

  return {
    conta: cardapio.conta,
    categorias: cardapio.categorias.filter((c) => c.ativa),
    produtos: cardapio.produtos.filter((p) => categoriasAtivas.has(p.categoria_id)),
    destaques: destaquesVisiveis,
    slug,
    nomeConta: conta.page_name as string,
    corDestaque: corValida(cardapio.conta.cor_destaque),
  };
}

/* ---------- escrita (só via rota de ações) ---------- */

export async function salvarConta(accountId: string, f: FormData) {
  const nome = limpa(f.get("nome_exibicao"), 120);
  if (!nome) throw new ErroCardapio("Informe o nome que aparece no cardápio.");
  const admin = criarClienteAdmin();
  const { error } = await admin.from("cardapio_contas").upsert(
    {
      account_id: accountId,
      nome_exibicao: nome,
      tagline: limpa(f.get("tagline"), 200),
      cor_destaque: corValida(limpa(f.get("cor_destaque"), 7)),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
  if (error) throw error;
}

export async function definirHabilitado(accountId: string, habilitado: boolean) {
  const admin = criarClienteAdmin();
  const atual = await carregarConta(accountId);
  const { error } = await admin.from("cardapio_contas").upsert(
    {
      account_id: accountId,
      habilitado,
      nome_exibicao: atual?.nome_exibicao || "Cardápio",
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
  if (error) throw error;
}

async function proximaPosicao(tabela: "cardapio_categorias" | "cardapio_produtos", filtro: Record<string, string>) {
  const admin = criarClienteAdmin();
  let q = admin.from(tabela).select("posicao").order("posicao", { ascending: false }).limit(1);
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v);
  const { data } = await q;
  return (data?.[0]?.posicao ?? -1) + 1;
}

export async function criarCategoria(accountId: string, f: FormData) {
  const nome = limpa(f.get("nome"), 80);
  if (!nome) throw new ErroCardapio("Informe o nome da categoria.");
  const admin = criarClienteAdmin();
  const { error } = await admin.from("cardapio_categorias").insert({
    account_id: accountId,
    nome,
    descricao: limpa(f.get("descricao"), 300),
    layout: layoutValido(f.get("layout")?.toString()),
    posicao: await proximaPosicao("cardapio_categorias", { account_id: accountId }),
  });
  if (error) throw error;
}

export async function definirLayoutCategoria(accountId: string, categoriaId: string, layout: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("cardapio_categorias")
    .update({ layout: layoutValido(layout) })
    .eq("id", categoriaId)
    .eq("account_id", accountId);
  if (error) throw error;
}

export async function excluirCategoria(accountId: string, categoriaId: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin.from("cardapio_categorias").delete().eq("id", categoriaId).eq("account_id", accountId);
  if (error) throw error;
}

export async function criarProduto(accountId: string, f: FormData) {
  const nome = limpa(f.get("nome"), 120);
  if (!nome) throw new ErroCardapio("Informe o nome do produto.");
  const categoriaId = limpa(f.get("categoria_id"), 64);
  const admin = criarClienteAdmin();
  const { data: categoria } = await admin
    .from("cardapio_categorias")
    .select("id")
    .eq("id", categoriaId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!categoria) throw new ErroCardapio("Escolha uma categoria válida.");

  const foto = limpa(f.get("foto_url"), 400);
  if (foto && !/^(\/cardapio-fotos\/|https:\/\/)/.test(foto)) {
    throw new ErroCardapio("Foto inválida. Use um endereço https:// ou um caminho de /cardapio-fotos/.");
  }
  const tags = f.getAll("tags").map(String).filter((t): t is TagCardapio => (TAGS_CARDAPIO as readonly string[]).includes(t));
  const { error } = await admin.from("cardapio_produtos").insert({
    account_id: accountId,
    categoria_id: categoriaId,
    nome,
    descricao: limpa(f.get("descricao"), 500),
    preco_centavos: precoParaCentavos(limpa(f.get("preco"), 20)),
    foto_url: foto,
    tags: [...new Set(tags)],
    disponivel: true,
    posicao: await proximaPosicao("cardapio_produtos", { categoria_id: categoriaId }),
  });
  if (error) throw error;
}

export async function definirDisponibilidade(accountId: string, produtoId: string, disponivel: boolean) {
  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("cardapio_produtos")
    .update({ disponivel })
    .eq("id", produtoId)
    .eq("account_id", accountId);
  if (error) throw error;
}

export async function excluirProduto(accountId: string, produtoId: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin.from("cardapio_produtos").delete().eq("id", produtoId).eq("account_id", accountId);
  if (error) throw error;
}

export async function adicionarDestaque(accountId: string, f: FormData) {
  const produtoId = limpa(f.get("produto_id"), 64);
  const tipo = limpa(f.get("tipo"), 20) as "promo" | "destaque";
  const prazoChave = limpa(f.get("prazo"), 10);
  const prazo = PRAZOS[tipo]?.[prazoChave];
  if (!prazo) throw new ErroCardapio("Escolha por quanto tempo vale.");

  const admin = criarClienteAdmin();
  const { data: produto } = await admin
    .from("cardapio_produtos")
    .select("id")
    .eq("id", produtoId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!produto) throw new ErroCardapio("Escolha um produto válido.");

  const precoTexto = limpa(f.get("preco_promocional"), 20);
  const precoPromo = tipo === "promo" && precoTexto ? precoParaCentavos(precoTexto) : null;

  // Um produto ocupa uma vez cada tipo: adicionar de novo renova o prazo.
  await admin.from("cardapio_destaques").delete().eq("produto_id", produtoId).eq("tipo", tipo).eq("account_id", accountId);
  const { error } = await admin.from("cardapio_destaques").insert({
    account_id: accountId,
    produto_id: produtoId,
    tipo,
    ate: fimDoPeriodo(prazo.dias).toISOString(),
    preco_promocional_centavos: precoPromo,
  });
  if (error) throw error;
}

export async function removerDestaque(accountId: string, destaqueId: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin.from("cardapio_destaques").delete().eq("id", destaqueId).eq("account_id", accountId);
  if (error) throw error;
}

/* ---------- acesso do dono do restaurante (/cardapio/[slug]/adm) ---------- */

/** Senha do dono, guardada como hash (scrypt). Nunca em texto puro. */
export async function definirSenhaDono(accountId: string, senha: string) {
  if (senha.length < 6) throw new ErroCardapio("A senha do dono precisa ter pelo menos 6 caracteres.");
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64).toString("hex");
  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("cardapio_contas")
    .update({ senha_dono_hash: `scrypt$${sal}$${hash}`, atualizado_em: new Date().toISOString() })
    .eq("account_id", accountId);
  if (error) throw error;
}

export function conferirSenhaDono(hashGuardado: string | null | undefined, senha: string): boolean {
  if (!hashGuardado) return false;
  const [tipo, sal, hash] = hashGuardado.split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(senha, sal, esperado.length);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

const segredoDoAcessoAdm = () => {
  const base = process.env.FUNCIONARIO_SESSAO_SECRET;
  if (!base) throw new ErroCardapio("Acesso do dono indisponível: falta configurar o segredo do servidor.");
  return `${base}:cardapio-adm`;
};

/** Cookie assinado com o id da conta e a validade (12 horas). Só o servidor gera e confere. */
export function gerarSessaoAdm(accountId: string, agora: number = Date.now()): string {
  const exp = String(agora + 12 * HORA);
  const assinatura = createHmac("sha256", segredoDoAcessoAdm()).update(`${accountId}.${exp}`).digest("hex");
  return `${accountId}.${exp}.${assinatura}`;
}

/** Devolve o id da conta se o cookie for válido e não tiver vencido; senão null. */
export function lerSessaoAdm(valor: string | undefined, agora: number = Date.now()): string | null {
  if (!valor) return null;
  const [accountId, exp, assinatura] = valor.split(".");
  if (!accountId || !exp || !assinatura || Number(exp) < agora) return null;
  const esperada = createHmac("sha256", segredoDoAcessoAdm()).update(`${accountId}.${exp}`).digest("hex");
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b) ? accountId : null;
}

export const NOME_COOKIE_ADM = "cd_adm_sessao";

/** Conta pelo endereço público, só se o cardápio estiver liberado. */
export async function contaDoDonoPorSlug(slug: string) {
  const admin = criarClienteAdmin();
  const { data: conta } = await admin.from("chatbot_accounts").select("id, page_name").eq("slug", slug).maybeSingle();
  if (!conta) return null;
  const { data: cfg } = await admin
    .from("cardapio_contas")
    .select("habilitado, senha_dono_hash")
    .eq("account_id", conta.id)
    .maybeSingle();
  if (!cfg?.habilitado) return null;
  return {
    accountId: conta.id as string,
    nomeConta: conta.page_name as string,
    senhaHash: (cfg.senha_dono_hash as string | null) ?? null,
  };
}
