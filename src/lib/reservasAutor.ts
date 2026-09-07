import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { criarClienteAdmin } from "@/lib/supabase/admin";
import { NOME_DO_COOKIE_DE_SESSAO } from "@/lib/funcionarios-cookie";

// Quem pode editar/excluir uma reserva em /reservas: o Victor (sessão normal, Supabase Auth) ou
// um funcionário (sessão própria, só da conta dele — precisa saber qual, pra barrar tentativa de
// mexer numa reserva de outra conta). Usado pelas rotas de editar/excluir pra saber quem gravar
// no log de alterações.
export type AutorDaAcao =
  | { tipo: "admin"; autor: string }
  | { tipo: "funcionario"; autor: string; contaId: string };

export async function resolverAutorDaAcao(
  request: NextRequest,
  admin: ReturnType<typeof criarClienteAdmin>
): Promise<AutorDaAcao | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chaveAnonima) {
    // Sem essas duas variáveis não dá pra confirmar sessão do Victor (só sobra a checagem de
    // funcionário abaixo) — loga pra não ficar invisível quando alguém autenticado como admin
    // toma 401 numa rota que devia reconhecer ele. Mesmo aviso que o middleware já dá quando
    // falta essa configuração.
    console.error(
      "resolverAutorDaAcao: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes — sessão de admin não pôde ser verificada."
    );
  } else {
    const supabase = createServerClient(url, chaveAnonima, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {
          // Só lendo a sessão aqui, não precisa renovar/gravar cookie nessa checagem pontual.
        },
      },
    });

    // getSession() em vez de getUser() — mesmo motivo do middleware.ts: confere a sessão
    // localmente (sem round-trip de rede a cada editar/excluir/busca sob demanda), só chamando o
    // Supabase quando o token realmente precisa renovar.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return { tipo: "admin", autor: session.user.email ?? "Victor" };
    }
  }

  const token = request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  if (token) {
    const { data: sessao } = await admin
      .from("chatbot_funcionario_sessoes")
      .select("chatbot_funcionarios(usuario, account_id, chatbot_accounts(active))")
      .eq("token", token)
      .maybeSingle();

    const funcionario = (sessao as any)?.chatbot_funcionarios;
    if (funcionario?.usuario && funcionario?.chatbot_accounts?.active) {
      return { tipo: "funcionario", autor: funcionario.usuario, contaId: funcionario.account_id };
    }
  }

  return null;
}
