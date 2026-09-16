import { criarClienteAdmin } from "@/lib/supabase/admin";
import { CartaoDeSecao } from "../CartaoDeSecao";
import { CLASSE_CAMPO, CLASSE_RÓTULO, CLASSE_BOTAO_SALVAR, CLASSE_AVISO_ERRO } from "../estilosDeCampo";

export const dynamic = "force-dynamic";

export default async function IgnoradosPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string };
}) {
  const admin = criarClienteAdmin();

  const { data: ignorados } = await admin
    .from("chatbot_ignorados")
    .select("id, instagram_username, nome, created_at")
    .eq("account_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Ignorados</h2>
        <p className="mt-1.5 text-sm text-neutral-400">
          @usuários que o bot nunca deve responder (ex.: o próprio dono da conta) — toda mensagem
          vinda de um desses @usuários é ignorada completamente, sem resposta e sem aparecer no
          histórico de Atendimentos.
        </p>
      </div>

      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <div className="flex flex-col gap-3">
        {(ignorados ?? []).map((ignorado) => (
          <div
            key={ignorado.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]"
          >
            <div>
              <div className="text-sm font-semibold text-neutral-100">@{ignorado.instagram_username}</div>
              {ignorado.nome && <div className="mt-0.5 text-xs text-neutral-500">{ignorado.nome}</div>}
            </div>
            <form action={`/api/ignorados/${ignorado.id}/excluir`} method="POST">
              <button type="submit" className="text-xs font-medium text-red-400/80 hover:text-red-300">
                Excluir
              </button>
            </form>
          </div>
        ))}

        {(ignorados ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-neutral-400">
            Nenhum @usuário ignorado ainda.
          </p>
        )}
      </div>

      <CartaoDeSecao titulo="+ Adicionar @usuário">
        <form action="/api/ignorados" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="account_id" value={params.id} />

          <div>
            <label className={CLASSE_RÓTULO}>@usuário do Instagram (sem o @)</label>
            <input
              type="text"
              name="instagram_username"
              required
              placeholder="breno_unicosushibar"
              className={CLASSE_CAMPO}
            />
          </div>

          <div>
            <label className={CLASSE_RÓTULO}>Nome (opcional, só pra identificar depois)</label>
            <input type="text" name="nome" placeholder="Breno Costa" className={CLASSE_CAMPO} />
          </div>

          <button type="submit" className={CLASSE_BOTAO_SALVAR}>
            Salvar
          </button>
        </form>
      </CartaoDeSecao>
    </div>
  );
}
