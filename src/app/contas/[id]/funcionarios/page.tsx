import { criarClienteAdmin } from "@/lib/supabase/admin";
import { CartaoDeSecao } from "../CartaoDeSecao";
import { CLASSE_CAMPO, CLASSE_RÓTULO, CLASSE_AJUDA, CLASSE_BOTAO_SALVAR, CLASSE_AVISO_SALVO, CLASSE_AVISO_ERRO } from "../estilosDeCampo";

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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Funcionários</h2>
        <p className="mt-1.5 text-sm text-neutral-400">
          Login separado do seu, só pra acessar a tela de{" "}
          <a href={`/reservas?conta=${params.id}`} className="text-indigo-300 underline hover:text-indigo-200">
            Reservas
          </a>{" "}
          — nenhum funcionário enxerga o resto desse painel. Pra tirar o acesso de alguém, é só
          excluir aqui.
        </p>
      </div>

      {searchParams.criado && <div className={CLASSE_AVISO_SALVO}>Funcionário criado.</div>}
      {searchParams.erro && <div className={CLASSE_AVISO_ERRO}>{searchParams.erro}</div>}

      <div className="flex flex-col gap-3">
        {(funcionarios ?? []).map((funcionario) => (
          <div
            key={funcionario.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]"
          >
            <span className="text-sm font-semibold text-neutral-100">{funcionario.usuario}</span>
            <form action={`/api/funcionarios/${funcionario.id}/excluir`} method="POST">
              <button type="submit" className="text-xs font-medium text-red-400/80 hover:text-red-300">
                Excluir
              </button>
            </form>
          </div>
        ))}

        {(funcionarios ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-neutral-400">
            Nenhum funcionário cadastrado ainda.
          </p>
        )}
      </div>

      <CartaoDeSecao titulo="+ Novo funcionário">
        <form action="/api/funcionarios" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="account_id" value={params.id} />

          <div>
            <label className={CLASSE_RÓTULO}>Usuário</label>
            <input type="text" name="usuario" required placeholder="Ex: recepcao" className={CLASSE_CAMPO} />
          </div>

          <div>
            <label className={CLASSE_RÓTULO}>Senha (mínimo 6 caracteres)</label>
            <input type="text" name="senha" required minLength={6} className={CLASSE_CAMPO} />
            <p className={CLASSE_AJUDA}>
              Anota em algum lugar antes de salvar — depois de criado não dá pra ver a senha de
              novo, só cadastrar uma nova pessoa ou excluir esta.
            </p>
          </div>

          <button type="submit" className={CLASSE_BOTAO_SALVAR}>
            Criar funcionário
          </button>
        </form>
      </CartaoDeSecao>
    </div>
  );
}
