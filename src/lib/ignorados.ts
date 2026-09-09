import { criarClienteAdmin } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof criarClienteAdmin>;

/**
 * Lista de @usuários que o bot nunca deve responder (ex.: o próprio dono da conta), cadastrada em
 * `/contas/[id]/ignorados`. Checada ANTES de processar qualquer mensagem — se bater, o bot ignora
 * completamente (nem responde, nem registra em chatbot_atendimentos).
 */

/**
 * Checagem rápida (sem trazer linha nenhuma) se a conta tem QUALQUER @usuário cadastrado pra
 * ignorar — usada no webhook direto pra decidir se vale a pena buscar o perfil do cliente na
 * Graph API (custa uma chamada extra) antes mesmo de saber se tem algo pra checar. A maioria das
 * contas não usa isso, então essa checagem evita o custo extra na maioria das mensagens.
 */
export async function contaTemIgnorados(admin: Admin, accountId: string): Promise<boolean> {
  const { count } = await admin
    .from("chatbot_ignorados")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);

  return (count ?? 0) > 0;
}

export async function usernameEstaIgnorado(
  admin: Admin,
  accountId: string,
  username: string | null
): Promise<boolean> {
  if (!username) return false;

  const { data } = await admin
    .from("chatbot_ignorados")
    .select("id")
    .eq("account_id", accountId)
    .eq("instagram_username", username.toLowerCase())
    .maybeSingle();

  return !!data;
}
