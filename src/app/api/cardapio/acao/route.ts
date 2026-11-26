import { NextRequest, NextResponse } from "next/server";
import {
  ErroCardapio,
  adicionarDestaque,
  criarCategoria,
  criarProduto,
  definirDisponibilidade,
  definirLayoutCategoria,
  definirHabilitado,
  excluirCategoria,
  excluirProduto,
  definirSenhaDono,
  removerDestaque,
  salvarConta,
  salvarGrupoAdicional,
  excluirGrupoAdicional,
  criarAdicional,
  definirDisponibilidadeAdicional,
  excluirAdicional,
} from "@/lib/cardapio";

// Ações do módulo Cardápio digital. Uma rota só, com a ação dentro do formulário, para o módulo
// ficar isolado num lugar. Protegida pelo middleware (sessão obrigatória), como as demais /api.
export async function POST(request: NextRequest) {
  const f = await request.formData();
  const accountId = f.get("account_id")?.toString() ?? "";
  const acao = f.get("acao")?.toString() ?? "";
  const voltarPara = f.get("redirect_to")?.toString() || (accountId ? `/contas/${accountId}/cardapio` : "/contas");

  if (!accountId) return NextResponse.redirect(new URL("/contas", request.url), 303);

  try {
    switch (acao) {
      case "habilitar":
        await definirHabilitado(accountId, f.get("habilitar")?.toString() === "1");
        break;
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
      case "senha_dono":
        await definirSenhaDono(accountId, f.get("senha")?.toString() ?? "");
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
    return NextResponse.redirect(new URL(`${voltarPara}?salvo=1`, request.url), 303);
  } catch (erro) {
    const mensagem = erro instanceof ErroCardapio ? erro.message : "Não foi possível salvar. Tente de novo.";
    if (!(erro instanceof ErroCardapio)) console.error("Cardápio digital: falha na ação", acao, erro);
    return NextResponse.redirect(new URL(`${voltarPara}?erro=${encodeURIComponent(mensagem)}`, request.url), 303);
  }
}
