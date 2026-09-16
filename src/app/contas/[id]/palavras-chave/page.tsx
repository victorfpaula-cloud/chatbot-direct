import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { CartaoDeSecao } from "../CartaoDeSecao";
import {
  CLASSE_CAMPO,
  CLASSE_CAMPO_TEXTAREA,
  CLASSE_RÓTULO,
  CLASSE_AJUDA,
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
  // telas de Reserva/Agendamento/Busca Automática: some a configuração, só mostra o jeito de
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
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Palavras-chave</h2>
        <p className="mt-1.5 text-sm text-neutral-400">
          Quando o cliente manda uma dessas palavras, o bot responde com a sequência de mensagens
          configurada — sem precisar de nenhum fluxo automático (Reserva/Agendamento) por trás.
        </p>
      </div>

      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <div className="flex flex-col gap-3">
        {(palavrasChave ?? []).map((pc) => (
          <div
            key={pc.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-neutral-100">{pc.palavra_chave}</div>
              <form action={`/api/keywords/${pc.id}/excluir`} method="POST">
                <button type="submit" className="text-xs font-medium text-red-400/80 hover:text-red-300">
                  Excluir
                </button>
              </form>
            </div>
            {pc.pausa_entre_mensagens_ms ? (
              <p className={CLASSE_AJUDA}>Pausa entre mensagens: {pc.pausa_entre_mensagens_ms}ms</p>
            ) : null}
            <ol className="mt-2 flex flex-col gap-1 text-xs text-neutral-400">
              {((pc.mensagens as string[]) ?? []).map((m, i) => (
                <li key={i}>
                  {i + 1}. {m}
                </li>
              ))}
            </ol>
          </div>
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
