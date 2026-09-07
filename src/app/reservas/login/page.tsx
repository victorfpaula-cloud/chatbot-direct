export const dynamic = "force-dynamic";

const MENSAGEM_INDISPONIVEL = "Esta página não está disponível. Entre em contato com o suporte.";

export default function LoginDeFuncionarioPage({
  searchParams,
}: {
  searchParams: { erro?: string; indisponivel?: string };
}) {
  const indisponivel = searchParams.indisponivel === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-lg shadow-black/40">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-900">
            CD
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-100">Reservas</div>
            <p className="mt-1 text-xs text-neutral-500">Acesso da equipe do restaurante</p>
          </div>
        </div>

        {indisponivel ? (
          // Conta pausada — nem mostra o formulário: tentar de novo não resolve nada, então só
          // confunde deixar a pessoa preencher usuário/senha de novo pra cair na mesma mensagem.
          <div className="mt-6 rounded-lg border border-amber-900 bg-amber-950 px-4 py-3 text-sm text-amber-200">
            {MENSAGEM_INDISPONIVEL}
          </div>
        ) : (
          <>
            {searchParams.erro && (
              <div className="mt-6 rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
                {searchParams.erro}
              </div>
            )}

            <form action="/api/reservas/login" method="POST" className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-neutral-400">Usuário</label>
                <input
                  type="text"
                  name="usuario"
                  required
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Senha</label>
                <input
                  type="password"
                  name="senha"
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950"
              >
                Entrar
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
