import type { criarClienteAdmin } from "./supabase/admin";

// Nome do cookie de sessão, separado de src/lib/funcionarios.ts de propósito: o middleware (que
// roda em Edge Runtime, sem `node:crypto`) importa daqui, nunca o hash/verificação de senha — que
// fica em funcionarios.ts e só roda em rota normal (Node.js). A validação de sessão abaixo também
// mora aqui pelo mesmo motivo: é só uma consulta ao banco, sem nenhum uso de `node:crypto`, então
// roda igual tanto no middleware (Edge) quanto nas páginas normais (Node.js).
export const NOME_DO_COOKIE_DE_SESSAO = "chatbot_funcionario_sessao";

export type ResultadoDaSessaoDeFuncionario =
  | { valida: true }
  | { valida: false; motivo: "sem_sessao" | "conta_pausada" };

/**
 * Confere se o token do cookie é uma sessão de funcionário válida E se a conta dele ainda está
 * ativa — pausar a conta (botão "Pausar" em /contas) já corta o acesso da equipe também, sem
 * precisar excluir ninguém nem mexer em mais nada além do botão que já existia. Usado tanto pelo
 * middleware (pra decidir se deixa passar) quanto por /reservas (pra saber por que recusou).
 */
export async function validarSessaoDeFuncionario(
  admin: ReturnType<typeof criarClienteAdmin>,
  token: string | undefined
): Promise<ResultadoDaSessaoDeFuncionario> {
  if (!token) return { valida: false, motivo: "sem_sessao" };

  const { data: sessao } = await admin
    .from("chatbot_funcionario_sessoes")
    .select("expira_em, chatbot_funcionarios(chatbot_accounts(active))")
    .eq("token", token)
    .maybeSingle();

  if (!sessao || new Date(sessao.expira_em).getTime() <= Date.now()) {
    return { valida: false, motivo: "sem_sessao" };
  }

  const contaAtiva = (sessao as any).chatbot_funcionarios?.chatbot_accounts?.active;
  if (!contaAtiva) {
    return { valida: false, motivo: "conta_pausada" };
  }

  return { valida: true };
}
