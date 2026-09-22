import { criarClienteAdmin } from "@/lib/supabase/admin";
import { formatarInstanteEmSaoPaulo } from "@/lib/datas";
import { CartaoDeSecao } from "../CartaoDeSecao";
import { CLASSE_CAMPO, CLASSE_RÓTULO, CLASSE_AJUDA, CLASSE_BOTAO_SALVAR, CLASSE_AVISO_SALVO, CLASSE_AVISO_ERRO } from "../estilosDeCampo";

export const dynamic = "force-dynamic";

type ResultadoDeTentativa = "sucesso" | "senha_incorreta" | "conta_pausada";

const RÓTULO_DO_RESULTADO: Record<ResultadoDeTentativa, string> = {
  sucesso: "Login",
  senha_incorreta: "Senha incorreta",
  conta_pausada: "Bloqueado (conta pausada)",
};

/**
 * Pra cada funcionário: a última tentativa de QUALQUER tipo (pra avisar "fulano bateu na porta"
 * mesmo se não conseguiu entrar) e, separado, o último login com sucesso (pode ser bem mais
 * antigo que a última tentativa, se as tentativas recentes falharam todas). Uma sessão ainda
 * válida (não expirada) é o mais perto que dá de "logado agora" — não existe presença em tempo
 * real nesse app (sem WebSocket/heartbeat), então isso quer dizer "tem uma sessão que não venceu
 * nem foi invalidada", não necessariamente "com o app aberto nesse exato instante".
 */
async function buscarStatusDeLoginDosFuncionarios(admin: ReturnType<typeof criarClienteAdmin>, funcionarioIds: string[]) {
  if (funcionarioIds.length === 0) {
    return new Map<string, { ultimaTentativa: { resultado: ResultadoDeTentativa; em: string }; ultimoSucesso: string | null; sessaoAtiva: boolean }>();
  }

  const [{ data: tentativas }, { data: sessoesAtivas }] = await Promise.all([
    admin
      .from("chatbot_funcionario_login_tentativas")
      .select("funcionario_id, resultado, tentado_em")
      .in("funcionario_id", funcionarioIds)
      .order("tentado_em", { ascending: false }),
    admin
      .from("chatbot_funcionario_sessoes")
      .select("funcionario_id")
      .in("funcionario_id", funcionarioIds)
      .gt("expira_em", new Date().toISOString()),
  ]);

  const idsComSessaoAtiva = new Set((sessoesAtivas ?? []).map((s) => s.funcionario_id as string));

  const status = new Map<
    string,
    { ultimaTentativa: { resultado: ResultadoDeTentativa; em: string }; ultimoSucesso: string | null; sessaoAtiva: boolean }
  >();

  // `tentativas` já vem ordenado da mais nova pra mais antiga — a primeira vez que um
  // funcionario_id aparece é sempre a tentativa mais recente dele.
  for (const tentativa of tentativas ?? []) {
    const id = tentativa.funcionario_id as string;
    const resultado = tentativa.resultado as ResultadoDeTentativa;

    const existente = status.get(id);
    if (!existente) {
      status.set(id, {
        ultimaTentativa: { resultado, em: tentativa.tentado_em },
        ultimoSucesso: resultado === "sucesso" ? tentativa.tentado_em : null,
        sessaoAtiva: idsComSessaoAtiva.has(id),
      });
    } else if (resultado === "sucesso" && !existente.ultimoSucesso) {
      existente.ultimoSucesso = tentativa.tentado_em;
    }
  }

  return status;
}

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

  const statusDeLogin = await buscarStatusDeLoginDosFuncionarios(
    admin,
    (funcionarios ?? []).map((f) => f.id)
  );

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
        {(funcionarios ?? []).map((funcionario) => {
          const status = statusDeLogin.get(funcionario.id);
          // Só vale a pena destacar a última tentativa separado do último sucesso quando ELA MESMA
          // não foi um sucesso — senão "Login" e "Última tentativa: Login" diriam a mesma coisa
          // duas vezes.
          const ultimaTentativaFoiFalha = status && status.ultimaTentativa.resultado !== "sucesso";

          return (
            <div
              key={funcionario.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 [backdrop-filter:blur(20px)_url(#vidro-cartao-contas)] [-webkit-backdrop-filter:blur(20px)_url(#vidro-cartao-contas)]"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">{funcionario.usuario}</span>
                  {status?.sessaoAtiva && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      Sessão ativa
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-500">
                  {status?.ultimoSucesso
                    ? `Último login: ${formatarInstanteEmSaoPaulo(status.ultimoSucesso)}`
                    : "Nunca fez login."}
                </p>

                {ultimaTentativaFoiFalha && (
                  <p className="text-xs text-amber-400/90">
                    Última tentativa: {RÓTULO_DO_RESULTADO[status.ultimaTentativa.resultado]} em{" "}
                    {formatarInstanteEmSaoPaulo(status.ultimaTentativa.em)}
                  </p>
                )}
              </div>

              <form action={`/api/funcionarios/${funcionario.id}/excluir`} method="POST">
                <button type="submit" className="shrink-0 text-xs font-medium text-red-400/80 hover:text-red-300">
                  Excluir
                </button>
              </form>
            </div>
          );
        })}

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
