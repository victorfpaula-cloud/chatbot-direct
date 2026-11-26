import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import { carregarCardapioDaConta } from "@/lib/cardapio";
import { PainelCardapio } from "@/app/cardapio/PainelCardapio";
import {
  CLASSE_AJUDA,
  CLASSE_AVISO_ERRO,
  CLASSE_AVISO_SALVO,
  CLASSE_BOTAO_SALVAR,
  CLASSE_CAMPO,
  CLASSE_ESTADO_DESLIGADO,
  CLASSE_RÓTULO,
  CLASSE_SECAO,
  CLASSE_TITULO_SECAO,
} from "../estilosDeCampo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CardapioContaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();
  const [cardapio, { data: contaChatbot }] = await Promise.all([
    carregarCardapioDaConta(params.id),
    admin.from("chatbot_accounts").select("slug").eq("id", params.id).maybeSingle(),
  ]);
  const { conta, categorias, produtos, destaques, grupos, adicionais, vinculos } = cardapio;
  const slug = (contaChatbot?.slug as string | null) ?? null;
  const habilitado = Boolean(conta?.habilitado);
  const voltar = `/contas/${params.id}/cardapio`;
  const senhaDefinida = Boolean(conta?.senha_dono_hash);

  const avisos = (
    <>
      {searchParams.salvo ? <p className={CLASSE_AVISO_SALVO}>Salvo.</p> : null}
      {searchParams.erro ? <p className={CLASSE_AVISO_ERRO}>{searchParams.erro}</p> : null}
    </>
  );

  if (!habilitado) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Cardápio digital</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            Cardápio online com categorias, promoções e destaques, em uma página própria da conta.
          </p>
        </div>
        {avisos}
        <div className={CLASSE_ESTADO_DESLIGADO}>
          <p className="text-sm text-neutral-400">O cardápio digital está desligado pra essa conta.</p>
          <form action="/api/cardapio/acao" method="POST">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="acao" value="habilitar" />
            <input type="hidden" name="habilitar" value="1" />
            <input type="hidden" name="redirect_to" value={voltar} />
            <Interruptor ligado={false} rotulo="Ativar cardápio digital" />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">Cardápio digital</h2>
          <p className="mt-1.5 text-sm text-neutral-400">
            {slug ? (
              <>
                Página pública:{" "}
                <a className="text-indigo-300 underline-offset-2 hover:underline" href={`/cardapio/${slug}`} target="_blank" rel="noopener">
                  /cardapio/{slug}
                </a>
                {" · "}
                Painel do dono:{" "}
                <a className="text-indigo-300 underline-offset-2 hover:underline" href={`/cardapio/${slug}/adm`} target="_blank" rel="noopener">
                  /cardapio/{slug}/adm
                </a>
              </>
            ) : (
              "Defina o slug da conta para ter os endereços públicos."
            )}
          </p>
        </div>
        <form action="/api/cardapio/acao" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="acao" value="habilitar" />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={voltar} />
          <Interruptor ligado={true} rotulo="Cardápio ativo" mensagemConfirmarDesligar="Desligar o cardápio digital dessa conta? A página pública e o painel do dono saem do ar até você ligar de novo." />
        </form>
      </div>

      {avisos}

      {/* Senha de acesso do dono */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Senha de acesso do dono</h3>
        <p className={CLASSE_AJUDA}>
          {senhaDefinida ? "Já existe uma senha definida. Digite outra para trocar." : "Defina a senha que o dono usa para entrar no painel dele."}{" "}
          Mínimo de 6 caracteres. Você pode trocar quando quiser.
        </p>
        <form action="/api/cardapio/acao" method="POST" className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="acao" value="senha_dono" />
          <input type="hidden" name="redirect_to" value={voltar} />
          <label className={`${CLASSE_RÓTULO} min-w-[220px] flex-1`}>
            Nova senha
            <input name="senha" type="password" required minLength={6} autoComplete="new-password" className={CLASSE_CAMPO} />
          </label>
          <button type="submit" className={CLASSE_BOTAO_SALVAR}>Salvar senha</button>
        </form>
      </section>

      <PainelCardapio
        actionUrl="/api/cardapio/acao"
        accountId={params.id}
        slug={slug}
        voltar={voltar}
        conta={conta}
        categorias={categorias}
        produtos={produtos}
        destaques={destaques}
        grupos={grupos}
        adicionais={adicionais}
        vinculos={vinculos}
      />
    </div>
  );
}
