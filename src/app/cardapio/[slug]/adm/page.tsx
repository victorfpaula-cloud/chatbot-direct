import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NOME_COOKIE_ADM, carregarCardapioDaConta, contaDoDonoPorSlug, lerSessaoAdm } from "@/lib/cardapio";
import { PainelCardapio } from "@/app/cardapio/PainelCardapio";
import { CLASSE_AVISO_ERRO, CLASSE_AVISO_SALVO, CLASSE_BOTAO_SALVAR, CLASSE_CAMPO, CLASSE_RÓTULO, CLASSE_SECAO } from "@/app/contas/[id]/estilosDeCampo";

// Painel do dono do restaurante. Só entra com a senha definida em /contas/[id]/cardapio.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { robots: { index: false, follow: false } };

export default async function PainelDoDonoPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const slug = params.slug.replace(/[^a-z0-9-]/gi, "");
  const conta = await contaDoDonoPorSlug(slug);
  if (!conta) notFound();

  const sessao = lerSessaoAdm(cookies().get(NOME_COOKIE_ADM)?.value);
  const logado = sessao === conta.accountId;

  const avisos = (
    <>
      {searchParams.salvo ? <p className={CLASSE_AVISO_SALVO}>Salvo.</p> : null}
      {searchParams.erro ? <p className={CLASSE_AVISO_ERRO}>{searchParams.erro}</p> : null}
    </>
  );

  if (!logado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 py-10">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Cardápio · {conta.nomeConta}</h1>
          <p className="mt-1.5 text-sm text-neutral-400">Entre com a senha do painel do restaurante.</p>
        </div>
        {avisos}
        <form action="/api/cardapio/adm/login" method="POST" className={`${CLASSE_SECAO} flex flex-col gap-3`}>
          <input type="hidden" name="slug" value={slug} />
          <label className={CLASSE_RÓTULO}>
            Senha
            <input name="senha" type="password" required autoComplete="current-password" className={CLASSE_CAMPO} />
          </label>
          <button type="submit" className={CLASSE_BOTAO_SALVAR}>Entrar</button>
        </form>
      </main>
    );
  }

  const cardapio = await carregarCardapioDaConta(conta.accountId);
  const voltar = `/cardapio/${slug}/adm`;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Cardápio · {conta.nomeConta}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            <a className="text-indigo-300 underline-offset-2 hover:underline" href={`/cardapio/${slug}`} target="_blank" rel="noopener">
              Ver como o cliente vê ↗
            </a>
          </p>
        </div>
      </div>

      {avisos}

      <PainelCardapio
        actionUrl="/api/cardapio/adm/acao"
        accountId={conta.accountId}
        slug={slug}
        voltar={voltar}
        conta={cardapio.conta}
        categorias={cardapio.categorias}
        produtos={cardapio.produtos}
        destaques={cardapio.destaques}
      />
    </main>
  );
}
