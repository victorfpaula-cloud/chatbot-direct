import { criarClienteAdmin } from "@/lib/supabase/admin";
import { notificarFalhaBuscaAutomatica } from "@/lib/webPush";

type Admin = ReturnType<typeof criarClienteAdmin>;

// Ingestão diária do site externo de cada conta (Busca ao Vivo) — 18/11/2026. Decisão arquitetural
// (conversa que criou o vertical Imobiliário): NUNCA acessar o site ao vivo durante uma conversa —
// só uma vez por dia, via cron (ver /api/cron/busca-automatica-ingestao), guardando um resumo em
// texto em chatbot_busca_automatica_conteudo. O Gemini sempre responde a partir dessa cópia interna
// (ver respostaAutomatica.ts), nunca fazendo fetch na hora. Isso é mais lento pra atualizar (até 1
// dia de atraso) mas muito mais "blindado a erro": um site fora do ar ou lento nunca atrasa nem
// quebra a resposta de uma mensagem de cliente de verdade.
const TIMEOUT_POR_REQUISICAO_MS = 15_000;
const USER_AGENT_DO_BOT = "Mozilla/5.0 (compatible; AutoMesaBot/1.0; +https://automesa.com.br)";
// Teto por site, pensado pra duas coisas ao mesmo tempo: não deixar o prompt do Gemini gigante (mais
// caro e mais lento em TODA mensagem, não só na sincronização) e não deixar a ingestão demorada
// demais num catálogo com milhares de imóveis. 40 imóveis já cobre o grosso do catálogo de uma
// imobiliária pequena/média (os dois sites testados tinham ~100-130 no total).
const LIMITE_DE_IMOVEIS_TECIMOB = 40;
const LIMITE_DE_CARACTERES_GENERICO = 6000;
// Busca os imóveis em lotes paralelos (não todos de uma vez, pra não parecer um ataque pro site
// de terceiro; nem um por um, senão 40 imóveis sequenciais fácil passam do tempo máximo da função
// serverless do cron).
const TAMANHO_DO_LOTE_PARALELO = 5;

async function buscarTexto(url: string): Promise<string> {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_POR_REQUISICAO_MS);

  try {
    const resposta = await fetch(url, {
      headers: { "User-Agent": USER_AGENT_DO_BOT },
      signal: controlador.signal,
      cache: "no-store",
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} ao buscar ${url}`);
    }

    return await resposta.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extrairNextData(html: string): any | null {
  const encontrado = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!encontrado) return null;

  try {
    return JSON.parse(encontrado[1]);
  } catch {
    return null;
  }
}

/** Resumo curto de 1 linha por imóvel — o bastante pra o Gemini responder "tem algo de 2 quartos
 * no centro?" sem precisar colar a ficha completa (fotos, amenidades, etc.) de cada imóvel. */
function resumirImovelTecimob(schema: any, urlImovel: string): string | null {
  const oferta = schema?.offers;
  const item = oferta?.itemOffered;
  if (!oferta || !item) return null;

  const endereco = item.address;
  const ehAluguel = typeof oferta.category === "string" && oferta.category.includes("ForRent");
  const condominio = Array.isArray(oferta.priceSpecification)
    ? oferta.priceSpecification.find((p: any) => p?.name === "Condomínio")?.price
    : null;

  const partes = [
    schema.name || item.name,
    `${ehAluguel ? "Aluguel" : "Venda"}: ${
      typeof oferta.price === "number" ? `R$ ${oferta.price.toLocaleString("pt-BR")}` : "sob consulta"
    }`,
    condominio ? `Condomínio: R$ ${Number(condominio).toLocaleString("pt-BR")}` : null,
    endereco
      ? [endereco.streetAddress, endereco.addressLocality && `${endereco.addressLocality}/${endereco.addressRegion ?? ""}`]
          .filter(Boolean)
          .join(", ")
      : null,
    item.numberOfBedrooms ? `${item.numberOfBedrooms} quarto(s)` : null,
    item.numberOfBathroomsTotal ? `${item.numberOfBathroomsTotal} banheiro(s)` : null,
    urlImovel,
  ].filter(Boolean);

  return partes.join(" — ");
}

/** Plataforma Tecimob (identificada pelo __NEXT_DATA__ da home com realEstateId) — lê o sitemap.xml
 * pra achar os imóveis e extrai o JSON-LD (Schema.org) de cada um, que já vem com preço/endereço/
 * quartos/banheiros prontos. Devolve null (não lança) quando o site não parece ser Tecimob, pra
 * cair no fallback genérico — ver extrairConteudoDoSite. */
async function tentarTecimob(urlConfigurada: string): Promise<string | null> {
  const origem = new URL(urlConfigurada).origin;

  const htmlDaHome = await buscarTexto(origem);
  const dadosDaHome = extrairNextData(htmlDaHome);
  const realEstateId = dadosDaHome?.props?.initialProps?.pageProps?.realEstateId;
  if (!realEstateId) return null;

  const sitemapXml = await buscarTexto(`${origem}/sitemap.xml`);
  const urlsDeImovel = Array.from(sitemapXml.matchAll(/<loc>([^<]*\/imovel\/[^<]*)<\/loc>/g)).map(
    (m) => m[1]
  );

  const urlsLimitadas = urlsDeImovel.slice(0, LIMITE_DE_IMOVEIS_TECIMOB);
  const resumos: string[] = [];

  for (let inicio = 0; inicio < urlsLimitadas.length; inicio += TAMANHO_DO_LOTE_PARALELO) {
    const lote = urlsLimitadas.slice(inicio, inicio + TAMANHO_DO_LOTE_PARALELO);

    const resumosDoLote = await Promise.all(
      lote.map(async (urlImovel) => {
        try {
          const htmlDoImovel = await buscarTexto(urlImovel);
          const dadosDoImovel = extrairNextData(htmlDoImovel);
          const schema = dadosDoImovel?.props?.initialProps?.pageProps?.propertySchema;
          return schema ? resumirImovelTecimob(schema, urlImovel) : null;
        } catch (erro) {
          // Um imóvel individual falhando (link quebrado, timeout pontual) não pode derrubar a
          // sincronização inteira da conta — só pula esse e segue com o resto do catálogo.
          console.error(`Falha ao buscar imóvel ${urlImovel} (ignorado, sincronização continua):`, erro);
          return null;
        }
      })
    );

    resumos.push(...resumosDoLote.filter((r): r is string => Boolean(r)));
  }

  return resumos.length > 0 ? resumos.join("\n") : null;
}

/** Fallback pra qualquer site que não seja Tecimob (ou cuja estrutura mudou): só pega o texto
 * visível da própria URL cadastrada e manda isso como contexto — sem entender "imóveis" ou
 * qualquer estrutura específica. É o suficiente pro caso original dessa feature (ex: programação
 * de um cinema) e serve de rede de segurança pra qualquer outro site. */
async function tentarGenerico(url: string): Promise<string> {
  const html = await buscarTexto(url);

  const textoVisivel = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  return textoVisivel.slice(0, LIMITE_DE_CARACTERES_GENERICO);
}

async function extrairConteudoDoSite(url: string): Promise<string> {
  try {
    const viaTecimob = await tentarTecimob(url);
    if (viaTecimob) return viaTecimob;
  } catch (erro) {
    // Detecção/leitura como Tecimob falhou (site mudou de estrutura, sitemap fora do ar, etc.) —
    // não é motivo pra desistir dessa conta, só cai pro fallback genérico abaixo.
    console.error("Falha ao tentar ler site como Tecimob (seguindo pro fallback genérico):", erro);
  }

  return await tentarGenerico(url);
}

/**
 * Roda a ingestão de TODAS as contas com Busca ao Vivo ligada e URL cadastrada — chamada pelo cron
 * diário (ver /api/cron/busca-automatica-ingestao). Cada conta roda dentro do próprio try/catch: a
 * conta de uma imobiliária com o site fora do ar nunca pode impedir a sincronização das outras.
 * Em caso de erro, grava a mensagem em busca_automatica_ultimo_erro (visível na aba Busca ao Vivo)
 * e manda um push pra quem ativou notificação naquela conta — mesmo canal que já avisa de reserva
 * nova/lotação, sem usar WhatsApp (combinado: WhatsApp fica pra depois).
 */
export async function sincronizarTodasAsContas(
  admin: Admin
): Promise<{ accountId: string; sucesso: boolean; erro?: string }[]> {
  const { data: contas, error } = await admin
    .from("chatbot_account_settings")
    .select("account_id, busca_automatica_url")
    .eq("busca_automatica_habilitada", true)
    .not("busca_automatica_url", "is", null);

  if (error) throw error;

  const resultados: { accountId: string; sucesso: boolean; erro?: string }[] = [];

  for (const conta of contas ?? []) {
    const url = conta.busca_automatica_url as string;

    try {
      const conteudo = await extrairConteudoDoSite(url);

      await admin.from("chatbot_busca_automatica_conteudo").upsert(
        {
          account_id: conta.account_id,
          conteudo,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "account_id" }
      );

      await admin
        .from("chatbot_account_settings")
        .update({
          busca_automatica_ultima_sincronizacao: new Date().toISOString(),
          busca_automatica_ultimo_erro: null,
        })
        .eq("account_id", conta.account_id);

      resultados.push({ accountId: conta.account_id, sucesso: true });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      console.error(`Falha ao sincronizar Busca ao Vivo da conta ${conta.account_id}:`, erro);

      await admin
        .from("chatbot_account_settings")
        .update({ busca_automatica_ultimo_erro: mensagem.slice(0, 500) })
        .eq("account_id", conta.account_id);

      await notificarFalhaBuscaAutomatica(admin, conta.account_id, mensagem);

      resultados.push({ accountId: conta.account_id, sucesso: false, erro: mensagem });
    }
  }

  return resultados;
}
