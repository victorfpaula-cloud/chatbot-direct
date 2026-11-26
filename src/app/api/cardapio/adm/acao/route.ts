import { NextRequest, NextResponse } from "next/server";
import {
  ErroCardapio,
  NOME_COOKIE_ADM,
  adicionarDestaque,
  criarCategoria,
  criarProduto,
  definirDisponibilidade,
  definirLayoutCategoria,
  excluirCategoria,
  excluirProduto,
  lerSessaoAdm,
  removerDestaque,
  salvarConta,
  salvarGrupoAdicional,
  excluirGrupoAdicional,
  criarAdicional,
  definirDisponibilidadeAdicional,
  excluirAdicional,
} from "@/lib/cardapio";

// Ações do painel do dono (/cardapio/[slug]/adm). A conta vem do cookie assinado, nunca do
// formulário: o dono só mexe no próprio cardápio. Não permite ligar/desligar o cardápio nem
// trocar a senha — isso fica com você, no painel de contas.
export async function POST(request: NextRequest) {
  const f = await request.formData();
  const slug = (f.get("slug")?.toString() ?? "").replace(/[^a-z0-9-]/gi, "");
  const destino = `/cardapio/${slug}/adm`;
  const accountId = lerSessaoAdm(request.cookies.get(NOME_COOKIE_ADM)?.value);

  if (!accountId) {
    return NextResponse.redirect(new URL(`${destino}?erro=${encodeURIComponent("Sessão expirada. Entre de novo.")}`, request.url), 303);
  }

  const acao = f.get("acao")?.toString() ?? "";
  try {
    switch (acao) {
      case "conta_salvar":
        await salvarConta(accountId, f);
        break;
      case "categoria_criar":
        await criarCategoria(accountId, f);
        break;
      case "categoria_excluir":
        await excluirCategoria(accountId, f.get("categoria_id")?.toString() ?? "");
        break;
      case "categoria_layout":
        await definirLayoutCategoria(accountId, f.get("categoria_id")?.toString() ?? "", f.get("layout")?.toString() ?? "");
        break;
      case "produto_criar":
        await criarProduto(accountId, f);
        break;
      case "produto_disponivel":
        await definirDisponibilidade(accountId, f.get("produto_id")?.toString() ?? "", f.get("disponivel")?.toString() === "1");
        break;
      case "produto_excluir":
        await excluirProduto(accountId, f.get("produto_id")?.toString() ?? "");
        break;
      case "destaque_criar":
        await adicionarDestaque(accountId, f);
        break;
      case "destaque_remover":
        await removerDestaque(accountId, f.get("destaque_id")?.toString() ?? "");
        break;
      case "adicional_grupo_salvar":
        await salvarGrupoAdicional(accountId, f);
        break;
      case "adicional_grupo_excluir":
        await excluirGrupoAdicional(accountId, f.get("grupo_id")?.toString() ?? "");
        break;
      case "adicional_item_criar":
        await criarAdicional(accountId, f);
        break;
      case "adicional_item_disponivel":
        await definirDisponibilidadeAdicional(accountId, f.get("adicional_id")?.toString() ?? "", f.get("disponivel")?.toString() === "1");
        break;
      case "adicional_item_excluir":
        await excluirAdicional(accountId, f.get("adicional_id")?.toString() ?? "");
        break;
      default:
        throw new ErroCardapio("Ação desconhecida.");
    }
    return NextResponse.redirect(new URL(`${destino}?salvo=1`, request.url), 303);
  } catch (erro) {
    const mensagem = erro instanceof ErroCardapio ? erro.message : "Não foi possível salvar. Tente de novo.";
    if (!(erro instanceof ErroCardapio)) console.error("Cardápio (dono): falha na ação", acao, erro);
    return NextResponse.redirect(new URL(`${destino}?erro=${encodeURIComponent(mensagem)}`, request.url), 303);
  }
}
