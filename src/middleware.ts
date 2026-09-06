import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Exige login em todo o painel (/contas e tudo dentro dele — configuração do Gemini, palavras-
 * chave, reserva, histórico de atendimentos com nome/@usuário/WhatsApp de cliente) e em toda rota
 * de API que muda ou lê esses dados. Fica de fora só o que precisa ser acessível sem sessão de
 * verdade:
 * - `api/webhook/instagram`: quem chama é a Meta, não o navegador do Victor — validado pela
 *   própria assinatura HMAC (`X-Hub-Signature-256`), não por login.
 * - `/login`: senão ninguém conseguiria nem chegar na tela de login pra entrar.
 *
 * Mesmo padrão de autenticação (Supabase Auth por sessão/cookie) já usado no agendador-stories e
 * no ShoppingHub — inclusive o mesmo usuário já cadastrado lá funciona aqui, sem precisar criar
 * nada novo, porque os três projetos compartilham o mesmo projeto Supabase.
 *
 * Falha "aberta" (deixa passar sem exigir login) só se faltar configurar
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — evita derrubar o site inteiro por um esquecimento de
 * variável de ambiente; ainda assim registra um erro no log pra não passar despercebido.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chaveAnonima) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada — login desativado temporariamente."
    );
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, chaveAnonima, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname !== "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/webhook/instagram|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
