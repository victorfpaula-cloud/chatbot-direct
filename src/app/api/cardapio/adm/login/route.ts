import { NextRequest, NextResponse } from "next/server";
import { ErroCardapio, NOME_COOKIE_ADM, conferirSenhaDono, contaDoDonoPorSlug, gerarSessaoAdm } from "@/lib/cardapio";

// Login do dono do restaurante (/cardapio/[slug]/adm). Não usa a sessão do painel de contas:
// quem entra aqui é o dono, com a senha que você definiu em /contas/[id]/cardapio.
export async function POST(request: NextRequest) {
  const f = await request.formData();
  const slug = (f.get("slug")?.toString() ?? "").replace(/[^a-z0-9-]/gi, "");
  const senha = f.get("senha")?.toString() ?? "";
  const destino = `/cardapio/${slug}/adm`;

  if (!slug) return NextResponse.redirect(new URL("/", request.url), 303);

  try {
    const conta = await contaDoDonoPorSlug(slug);
    if (!conta || !conferirSenhaDono(conta.senhaHash, senha)) {
      // Pequena pausa para dificultar tentativas em sequência.
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.redirect(new URL(`${destino}?erro=${encodeURIComponent("Senha incorreta.")}`, request.url), 303);
    }
    const resposta = NextResponse.redirect(new URL(destino, request.url), 303);
    resposta.cookies.set(NOME_COOKIE_ADM, gerarSessaoAdm(conta.accountId), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return resposta;
  } catch (erro) {
    const mensagem = erro instanceof ErroCardapio ? erro.message : "Não foi possível entrar. Tente de novo.";
    return NextResponse.redirect(new URL(`${destino}?erro=${encodeURIComponent(mensagem)}`, request.url), 303);
  }
}
