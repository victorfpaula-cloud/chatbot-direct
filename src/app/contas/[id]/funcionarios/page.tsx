import { criarClienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function FuncionariosPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; criado?: string };
}) {
  const admin = criarClienteAdmin();

  const { data: funcionarios } = await admin
    .from("chatbot_funcionarios")
    .select("id, usuario, created_at")
    .eq("account_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h2 className="text-lg font-semibold">Funcionários</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Login separado do seu, só pra acessar a tela de{" "}
        <a href={`/reservas?conta=${params.id}`} className="underline hover:text-neutral-200">
          Reservas
        </a>{" "}
        — nenhum funcionário enxerga o resto desse painel. Pra tirar o acesso de alguém, é só
        excluir aqui.
      </p>

      {searchParams.criado && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950 px-4 py-2 text-sm text-green-300">
          Funcionário criado.
        </div>
      )}

      {searchParams.erro && (
        <div className="mt-4 break-words rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {searchParams.erro}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {(funcionarios ?? []).map((funcionario) => (
          <div
            key={funcionario.id}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <span className="text-sm font-medium text-neutral-200">{funcionario.usuario}</span>
            <form action={`/api/funcionarios/${funcionario.id}/excluir`} method="POST">
              <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                Excluir
              </button>
            </form>
          </div>
        ))}

        {(funcionarios ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-700 px-4 py-6 text-center text-sm text-neutral-400">
            Nenhum funcionário cadastrado ainda.
          </p>
        )}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-neutral-300">+ Novo funcionário</h3>

      <form action="/api/funcionarios" method="POST" className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="account_id" value={params.id} />

        <div>
          <label className="text-xs text-neutral-400">Usuário</label>
          <input
            type="text"
            name="usuario"
            required
            placeholder="Ex: recepcao"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">Senha (mínimo 6 caracteres)</label>
          <input
            type="text"
            name="senha"
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Anota em algum lugar antes de salvar — depois de criado não dá pra ver a senha de
            novo, só cadastrar uma nova pessoa ou excluir esta.
          </p>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-500"
        >
          Criar funcionário
        </button>
      </form>
    </div>
  );
}
