import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios-cookie";

/**
 * Exige login em todo o painel (/contas e tudo dentro dele — configuração do Gemini, palavras-
 * chave, reserva, histórico de atendimentos com nome/@usuário/WhatsApp de cliente, funcionários) e
 * em toda rota de API que muda ou lê esses dados. Fica de fora só o que precisa ser acessível sem
 * sessão de verdade:
 * - `api/webhook/instagram`: quem chama é a Meta, não o navegador do Victor — validado pela
 *   própria assinatura HMAC (`X-Hub-Signature-256`), não por login.
 * - `/login`: senão ninguém conseguiria nem chegar na tela de login pra entrar.
 *
 * Mesmo padrão de autenticação (Supabase Auth por sessão/cookie) já usado no agendador-stories e
 * no ShoppingHub — inclusive o mesmo usuário já cadastrado lá funciona aqui, sem precisar criar
 * nada novo, porque os três projetos compartilham o mesmo projeto Supabase.
 *
 * `/reservas` (e seu logout) tem uma segunda porta de entrada, totalmente separada: o login
 * próprio dos funcionários do restaurante (`chatbot_funcionarios`/`chatbot_funcionario_sessoes`,
 * ver src/lib/funcionarios.ts) — pensado só pra dar acesso à tela de reservas do dia, sem
 * enxergar mais nada do painel. O Victor continua vendo essa mesma tela com a sessão normal dele.
 *
 * Falha "aberta" (deixa passar sem exigir login) só se faltar configurar
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — evita derrubar o site inteiro por um esquecimento de
 * variável de ambiente; ainda assim registra um erro no log pra não passar despercebido.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Público de propósito: a tela de login do funcionário e o envio do formulário dela — ninguém
  // consegue nem chegar ali se essas duas rotas também exigirem estar logado.
  if (pathname === "/reservas/login" || pathname === "/api/reservas/login") {
    return NextResponse.next();
  }

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

  if (user) {
    return response;
  }

  const ehRotaDeReservas = pathname === "/reservas" || pathname === "/api/reservas/logout";

  if (ehRotaDeReservas && (await temSessaoDeFuncionarioValida(request))) {
    return response;
  }

  const destino = request.nextUrl.clone();
  destino.pathname = ehRotaDeReservas ? "/reservas/login" : "/login";
  return NextResponse.redirect(destino);
}

async function temSessaoDeFuncionarioValida(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  if (!token) return false;

  const admin = criarClienteAdmin();
  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select("expira_em")
    .eq("token", token)
    .maybeSingle();

  if (!sessao) return false;

  return new Date(sessao.expira_em).getTime() > Date.now();
}

export const config = {
  matcher: [
    "/((?!api/webhook/instagram|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
