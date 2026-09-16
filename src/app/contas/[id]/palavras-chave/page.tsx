import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { CartaoDeSecao } from "../CartaoDeSecao";
import { CartaoDePalavraChave } from "./CartaoDePalavraChave";
import {
  CLASSE_CAMPO,
  CLASSE_CAMPO_TEXTAREA,
  CLASSE_RÓTULO,
  CLASSE_BOTAO_SALVAR,
  CLASSE_AVISO_ERRO,
  CLASSE_ESTADO_DESLIGADO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";

export default async function PalavrasChavePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string };
}) {
  const admin = criarClienteAdmin();

  const [{ data: palavrasChave }, { data: config }] = await Promise.all([
    admin
      .from("chatbot_keywords")
      .select("id, palavra_chave, mensagens, pausa_entre_mensagens_ms, ativo, created_at")
      .eq("account_id", params.id)
      .order("created_at", { ascending: true }),
    admin.from("chatbot_account_settings").select("chatbot_direct_habilitado").eq("account_id", params.id).maybeSingle(),
  ]);

  // Chatbot Direct desligado nessa conta (chavinha "Direct" em /contas) — mesmo espírito das
  // telas de Reserva/Agendamento/Busca ao Vivo: some a configuração, só mostra o jeito de
  // ligar de novo. `!== false` (não `?? true`) porque config pode vir null numa conta muito nova
  // ainda sem linha de configuração — nesse caso o padrão é ligado, igual sempre foi.
  if (config?.chatbot_direct_habilitado === false) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Palavras-chave</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Quando o cliente manda uma dessas palavras, o bot responde com a sequência de mensagens
            configurada.
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
            <input type="hidden" name="redirect_to" value={`/contas/${params.id}/palavras-chave`} />
            <Interruptor ligado={false} rotulo="Ativar Chatbot Direct" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Palavras-chave</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Quando o cliente manda uma dessas palavras, o bot responde com a sequência de mensagens
            configurada — sem precisar de nenhum fluxo automático (Reserva/Agendamento) por trás.
          </p>
        </div>
        <a
          href={`/contas/${params.id}/relatorios`}
          className="shrink-0 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:border-indigo-400/50 hover:bg-indigo-500/20"
        >
          Relatórios
        </a>
      </div>

      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <div className="flex flex-col gap-3">
        {(palavrasChave ?? []).map((pc) => (
          <CartaoDePalavraChave key={pc.id} contaId={params.id} pc={pc} />
        ))}

        {(palavrasChave ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-neutral-400">
            Nenhuma palavra-chave cadastrada ainda.
          </p>
        )}
      </div>

      <CartaoDeSecao titulo="+ Nova palavra-chave">
        <form action="/api/keywords" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="account_id" value={params.id} />

          <div>
            <label className={CLASSE_RÓTULO}>
              Palavra-chave (pode colocar variações separadas por vírgula, ex: preço, valor, quanto
              custa)
            </label>
            <input type="text" name="palavra_chave" required className={CLASSE_CAMPO} />
          </div>

          <div>
            <label className={CLASSE_RÓTULO}>
              Mensagens da sequência (na ordem — deixa em branco a que não for usar)
            </label>
            <div className="mt-1.5 flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <textarea
                  key={n}
                  name={`mensagem_${n}`}
                  placeholder={`Mensagem ${n}`}
                  rows={2}
                  className={CLASSE_CAMPO_TEXTAREA.replace("mt-1.5 ", "")}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={CLASSE_RÓTULO}>
              Pausa entre as mensagens, em milissegundos (opcional — deixa em branco pra mandar tudo
              de uma vez, sem pausa)
            </label>
            <input type="number" name="pausa_entre_mensagens_ms" min={0} placeholder="0" className={CLASSE_CAMPO} />
          </div>

          <button type="submit" className={CLASSE_BOTAO_SALVAR}>
            Salvar palavra-chave
          </button>
        </form>
      </CartaoDeSecao>
    </div>
  );
}
