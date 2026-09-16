import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente admin do OUTRO projeto Supabase — o Agendador de Stories (agendador-stories/), app
 * separado que publica Stories do Instagram sozinho em horários recorrentes. Banco separado do
 * chatbot-direct, mas com a MESMA conta profissional do Instagram por trás: lá a coluna se chama
 * `ig_user_id`, aqui `chatbot_accounts.instagram_user_id` — mesmo valor, então dá pra casar as
 * contas dos dois lados sem nenhuma tabela de mapeamento própria.
 *
 * Ao contrário de criarClienteAdmin() (que lança erro se faltar variável — o chatbot-direct não
 * funciona sem seu próprio Supabase), aqui retorna null: essa integração é opcional por conta, e
 * até ela ser configurada (ou pra quem nunca for usar o Agendador de Stories) nada mais na tela
 * pode quebrar por causa disso.
 */
export function agendadorStoriesConfigurado(): boolean {
  return Boolean(
    process.env.AGENDADOR_STORIES_SUPABASE_URL && process.env.AGENDADOR_STORIES_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function criarClienteAgendadorStories(): SupabaseClient | null {
  const url = process.env.AGENDADOR_STORIES_SUPABASE_URL;
  const serviceRoleKey = process.env.AGENDADOR_STORIES_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
