import { criarClienteAdmin } from "@/lib/supabase/admin";
import { CLASSE_CAMPO_TEXTAREA, CLASSE_RÓTULO, CLASSE_BOTAO_SALVAR, CLASSE_AVISO_SALVO, CLASSE_AVISO_ERRO } from "../estilosDeCampo";

export const dynamic = "force-dynamic";

export default async function GeminiConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();

  const { data: config } = await admin
    .from("chatbot_account_settings")
    .select("tom_de_voz, guardrails, base_conhecimento")
    .eq("account_id", params.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Gemini — atendimento por IA</h2>
        <p className="mt-1.5 text-sm text-neutral-400">
          Usado quando a mensagem do cliente não bate com nenhuma palavra-chave. Deixa em branco pra
          não responder nesses casos.
        </p>
      </div>

      {searchParams.salvo && <div className={CLASSE_AVISO_SALVO}>Configuração salva.</div>}
      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <form action="/api/gemini-config" method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className={CLASSE_RÓTULO}>Tom de voz</label>
          <textarea
            name="tom_de_voz"
            rows={3}
            defaultValue={config?.tom_de_voz ?? ""}
            placeholder="Ex: jovem, descontraído, fala como uma conversa entre amigos, sem formalidade"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>Guardrails (o que ele NUNCA pode fazer ou falar)</label>
          <textarea
            name="guardrails"
            rows={8}
            defaultValue={config?.guardrails ?? ""}
            placeholder="Ex: nunca falar de política, religião, concorrentes; nunca fazer reserva ou anotar pedido direto"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <div>
          <label className={CLASSE_RÓTULO}>
            Base de conhecimento (sobre o negócio, cardápio, horários, endereço etc.)
          </label>
          <textarea
            name="base_conhecimento"
            rows={16}
            defaultValue={config?.base_conhecimento ?? ""}
            placeholder="Cola aqui tudo que o Gemini precisa saber pra responder bem"
            className={CLASSE_CAMPO_TEXTAREA}
          />
        </div>

        <button type="submit" className={CLASSE_BOTAO_SALVAR}>
          Salvar configuração
        </button>
      </form>
    </div>
  );
}
