import { criarClienteAdmin } from "@/lib/supabase/admin";

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
    <div>
      <h2 className="text-lg font-semibold">Ignorados</h2>
      <p className="mt-1 text-sm text-neutral-400">
        @usuários que o bot nunca deve responder (ex.: o próprio dono da conta) — toda mensagem
        vinda de um desses @usuários é ignorada completamente, sem resposta e sem aparecer no
        histórico de Atendimentos.
      </p>

      {searchParams.erro && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {searchParams.erro}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {(ignorados ?? []).map((ignorado) => (
          <div
            key={ignorado.id}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <div>
              <div className="text-sm font-medium">@{ignorado.instagram_username}</div>
              {ignorado.nome && <div className="text-xs text-neutral-500">{ignorado.nome}</div>}
            </div>
            <form action={`/api/ignorados/${ignorado.id}/excluir`} method="POST">
              <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                Excluir
              </button>
            </form>
          </div>
        ))}

        {(ignorados ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-700 px-4 py-6 text-center text-sm text-neutral-400">
            Nenhum @usuário ignorado ainda.
          </p>
        )}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-neutral-300">+ Adicionar @usuário</h3>

      <form action="/api/ignorados" method="POST" className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className="text-xs text-neutral-400">@usuário do Instagram (sem o @)</label>
          <input
            type="text"
            name="instagram_username"
            required
            placeholder="breno_unicosushibar"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">Nome (opcional, só pra identificar depois)</label>
          <input
            type="text"
            name="nome"
            placeholder="Breno Costa"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-500"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
