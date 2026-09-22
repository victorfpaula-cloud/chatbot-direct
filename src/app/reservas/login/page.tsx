export const dynamic = "force-dynamic";

export default function LoginDeFuncionarioPage({
  searchParams,
}: {
  searchParams: { erro?: string; indisponivel?: string };
}) {
  const indisponivel = searchParams.indisponivel === "1";

  // Conta pausada (falta de pagamento, etc.) — de propósito NÃO usa a marca "Reservas" nem o
  // formulário de login: uma tela de erro genérica, sem cara de produto, deixa mais óbvio que
  // aquilo ali parou de funcionar por completo (tipo um link quebrado) em vez de parecer só uma
  // função temporariamente bloqueada dentro do app. Também evita reforçar a marca bem na hora que
  // a conta está inadimplente.
  if (indisponivel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-neutral-900">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium tracking-wide text-neutral-400">404</p>
          <h1 className="mt-2 text-xl font-semibold">Página não disponível</h1>
          <p className="mt-2 text-sm text-neutral-500">Entre em contato com o suporte.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-lg shadow-black/40">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/reservas-logo.png" alt="Reservas" className="h-12 w-12 rounded-full object-cover" />

          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-100">Reservas</div>
            <p className="mt-1 text-xs text-neutral-500">Acesso da equipe do restaurante</p>
          </div>
        </div>

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
      </div>
    </main>
  );
}
