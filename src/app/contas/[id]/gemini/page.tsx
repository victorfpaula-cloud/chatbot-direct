import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import {
  CLASSE_CAMPO_TEXTAREA,
  CLASSE_RÓTULO,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_SALVO,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
} from "../estilosDeCampo";

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
    .select("tom_de_voz, guardrails, base_conhecimento, chatbot_direct_habilitado")
    .eq("account_id", params.id)
    .maybeSingle();

  // Chatbot Direct desligado nessa conta (chavinha "Direct" em /contas) — mesmo espírito das
  // telas de Reserva/Agendamento/Busca Automática. Ver comentário igual em palavras-chave/page.tsx.
  if (config?.chatbot_direct_habilitado === false) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Gemini — atendimento por IA</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Usado quando a mensagem do cliente não bate com nenhuma palavra-chave.
          </p>
        </div>

        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">
            Chatbot Direct está desativado pra essa conta — a configuração fica escondida e o bot
            nunca responde por palavra-chave/Gemini até você ativar.
          </p>
          <form action="/api/contas/direct-status" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/gemini`} />
            <Interruptor ligado={false} rotulo="Ativar Chatbot Direct" />
          </form>
        </div>
      </div>
    );
  }

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
