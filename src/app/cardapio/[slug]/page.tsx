import { notFound } from "next/navigation";
import {
  FUSO_CARDAPIO,
  ROTULOS_TAGS,
  adicionaisDoProduto,
  carregarCardapioPublico,
  type Adicional,
  type Destaque,
  type GrupoAdicional,
  type Produto,
  type VinculoAdicional,
} from "@/lib/cardapio";
import { Vitrine, type CategoriaVitrine, type ItemVitrine, type VitrineDados } from "./Vitrine";

// Cardápio público do restaurante. Rota pública (fora do login), só lê as tabelas cardapio_*.
// Os dados são montados aqui e a vitrine (Vitrine.tsx) cuida da interação.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { robots: { index: false, follow: false } };

const diaDe = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_CARDAPIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Mesmo texto do protótipo: "Termina hoje..." ou "Até dd/mm, meia-noite". Vence à meia-noite do fuso do restaurante. */
function prazoDoDestaque(ate: string) {
  const ultimo = new Date(new Date(ate).getTime() - 1);
  if (diaDe(ultimo) === diaDe(new Date())) return "Termina hoje à meia-noite";
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_CARDAPIO, day: "2-digit", month: "2-digit" }).format(ultimo);
  return `Até ${data}, meia-noite`;
}

type Adicionais = {
  grupos: GrupoAdicional[];
  itens: Adicional[];
  vinculos: VinculoAdicional[];
  /** Ids das categorias em que a tabela de adicionais fica em dropdown. */
  dropdown: Set<string>;
};

function paraItem(p: Produto, categoria: string, destaque: Destaque | null, adc: Adicionais): ItemVitrine {
  return {
    chave: destaque ? `h${destaque.id}` : `p${p.id}`,
    nome: p.nome,
    descricao: p.descricao ?? "",
    precoCentavos: p.preco_centavos,
    promoCentavos: destaque?.preco_promocional_centavos ?? null,
    foto: p.foto_url ?? "",
    tags: (p.tags ?? []).map((t) => ({
      chave: t,
      rotulo: ROTULOS_TAGS[t as keyof typeof ROTULOS_TAGS] ?? t,
    })),
    disponivel: p.disponivel,
    categoria,
    prazo: destaque ? prazoDoDestaque(destaque.ate) : "",
    destaque: Boolean(destaque),
    adicionais: adicionaisDoProduto(p, adc.grupos, adc.itens, adc.vinculos).map((x) => ({
      nome: x.grupo.nome,
      itens: x.itens.map((i) => ({ nome: i.nome, precoCentavos: i.preco_centavos })),
    })),
    adicionaisDropdown: adc.dropdown.has(p.categoria_id),
  };
}

export default async function CardapioPublicoPage({ params }: { params: { slug: string } }) {
  const dados = await carregarCardapioPublico(params.slug);
  if (!dados) notFound();

  const { conta, categorias, produtos, destaques, corDestaque, nomeConta, grupos, adicionais, vinculos } = dados;
  const adc: Adicionais = {
    grupos,
    itens: adicionais,
    vinculos,
    dropdown: new Set(categorias.filter((c) => c.adicionais_dropdown).map((c) => c.id)),
  };
  const nomeDaCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));

  const itensDaCategoria = (id: string): ItemVitrine[] =>
    produtos
      .filter((p) => p.categoria_id === id)
      .sort((a, b) => a.posicao - b.posicao)
      .map((p) => paraItem(p, nomeDaCategoria.get(id) ?? "", null, adc));

  const categoriasVitrine: CategoriaVitrine[] = [...categorias]
    .sort((a, b) => a.posicao - b.posicao)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao ?? "",
      layout: c.layout,
      itens: itensDaCategoria(c.id),
    }));

  const destaqueItem = (d: Destaque): ItemVitrine | null => {
    const p = produtoPorId.get(d.produto_id);
    if (!p) return null;
    return paraItem(p, nomeDaCategoria.get(p.categoria_id) ?? "", d, adc);
  };
  const promocoes = destaques.filter((d) => d.tipo === "promo").map(destaqueItem).filter((i): i is ItemVitrine => i !== null);
  const escolhidos = destaques.filter((d) => d.tipo === "destaque").map(destaqueItem).filter((i): i is ItemVitrine => i !== null);

  const vitrine: VitrineDados = {
    nome: conta.nome_exibicao || nomeConta,
    tagline: conta.tagline ?? "",
    corDestaque,
    promocoes,
    destaques: escolhidos,
    categorias: categoriasVitrine,
  };

  return <Vitrine dados={vitrine} />;
}
