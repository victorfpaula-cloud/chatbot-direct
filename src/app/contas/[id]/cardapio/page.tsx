import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Interruptor } from "@/app/contas/Interruptor";
import {
  FUSO_CARDAPIO,
  PRAZOS,
  ROTULOS_TAGS,
  TAGS_CARDAPIO,
  carregarCardapioDaConta,
} from "@/lib/cardapio";
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

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO_CARDAPIO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const CLASSE_BOTAO_SMALL =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/[0.08]";
const CLASSE_BOTAO_PERIGO =
  "rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/60";

export default async function CardapioContaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erro?: string; salvo?: string };
}) {
  const admin = criarClienteAdmin();
  const [{ conta, categorias, produtos, destaques }, { data: contaChatbot }] = await Promise.all([
    carregarCardapioDaConta(params.id),
    admin.from("chatbot_accounts").select("slug").eq("id", params.id).maybeSingle(),
  ]);
  const slug = contaChatbot?.slug as string | null;
  const habilitado = Boolean(conta?.habilitado);
  const voltar = `/contas/${params.id}/cardapio`;

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

  const produtosDaCategoria = (categoriaId: string) => produtos.filter((p) => p.categoria_id === categoriaId);
  const nomeDoProduto = (produtoId: string) => produtos.find((p) => p.id === produtoId)?.nome ?? "Item removido";

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
              </>
            ) : (
              "Defina o slug da conta para ter o endereço público."
            )}
          </p>
        </div>
        <form action="/api/cardapio/acao" method="POST" className="shrink-0">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="acao" value="habilitar" />
          <input type="hidden" name="habilitar" value="0" />
          <input type="hidden" name="redirect_to" value={voltar} />
          <Interruptor ligado={true} rotulo="Cardápio ativo" mensagemConfirmarDesligar="Desligar o cardápio digital dessa conta? A página pública sai do ar até você ligar de novo." />
        </form>
      </div>

      {avisos}

      {/* Dados do cardápio */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Dados do cardápio</h3>
        <form action="/api/cardapio/acao" method="POST" className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="acao" value="conta_salvar" />
          <input type="hidden" name="redirect_to" value={voltar} />
          <label className={CLASSE_RÓTULO}>
            Nome que aparece no cardápio
            <input name="nome_exibicao" required maxLength={120} defaultValue={conta?.nome_exibicao} className={CLASSE_CAMPO} />
          </label>
          <label className={CLASSE_RÓTULO}>
            Frase de destaque (opcional)
            <input name="tagline" maxLength={200} defaultValue={conta?.tagline} className={CLASSE_CAMPO} />
          </label>
          <label className={CLASSE_RÓTULO}>
            Cor principal
            <input name="cor_destaque" type="color" defaultValue={conta?.cor_destaque} className="mt-1.5 h-10 w-20 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
          </label>
          <button type="submit" className={CLASSE_BOTAO_SALVAR}>Salvar dados</button>
        </form>
      </section>

      {/* Promoções e destaques */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Promoções e destaques</h3>
        <p className={CLASSE_AJUDA}>
          Vale até a meia-noite do último dia (1 dia = meia-noite de hoje; 2 dias = meia-noite de amanhã). Depois disso, sai sozinho.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {destaques.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma promoção ou destaque no ar.</p>
          ) : (
            destaques.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-sm text-neutral-200">
                  <span className="mr-2 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                    {d.tipo === "promo" ? "Promoção do dia" : "Destaque"}
                  </span>
                  {nomeDoProduto(d.produto_id)}
                  {d.preco_promocional_centavos != null ? ` · ${reais(d.preco_promocional_centavos)}` : ""}
                  <span className="ml-2 text-xs text-neutral-500">até {quando(d.ate)}</span>
                </div>
                <form action="/api/cardapio/acao" method="POST">
                  <input type="hidden" name="account_id" value={params.id} />
                  <input type="hidden" name="acao" value="destaque_remover" />
                  <input type="hidden" name="destaque_id" value={d.id} />
                  <input type="hidden" name="redirect_to" value={voltar} />
                  <button type="submit" className={CLASSE_BOTAO_SMALL}>Encerrar agora</button>
                </form>
              </div>
            ))
          )}
        </div>

        {produtos.length > 0 ? (
          <form action="/api/cardapio/acao" method="POST" className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="account_id" value={params.id} />
            <input type="hidden" name="acao" value="destaque_criar" />
            <input type="hidden" name="redirect_to" value={voltar} />
            <label className={`${CLASSE_RÓTULO} sm:col-span-2`}>
              Item
              <select name="produto_id" required className={CLASSE_CAMPO}>
                {categorias.map((c) => (
                  <optgroup key={c.id} label={c.nome}>
                    {produtosDaCategoria(c.id).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className={CLASSE_RÓTULO}>
              Tipo
              <select name="tipo" defaultValue="promo" className={CLASSE_CAMPO}>
                <option value="promo">Promoção do dia</option>
                <option value="destaque">Destaque</option>
              </select>
            </label>
            <label className={CLASSE_RÓTULO}>
              Por quanto tempo
              <select name="prazo" defaultValue="1d" className={CLASSE_CAMPO}>
                {Object.entries(PRAZOS.promo).map(([chave, p]) => (
                  <option key={chave} value={chave}>{p.rotulo}</option>
                ))}
              </select>
              <span className={CLASSE_AJUDA}>Destaque aceita 1 dia, 1 semana ou 1 mês.</span>
            </label>
            <label className={`${CLASSE_RÓTULO} sm:col-span-2`}>
              Preço promocional (opcional, só para promoção)
              <input name="preco_promocional" inputMode="decimal" placeholder="0,00" className={CLASSE_CAMPO} />
            </label>
            <button type="submit" className={`${CLASSE_BOTAO_SALVAR} sm:col-span-2`}>Colocar no ar</button>
          </form>
        ) : null}
      </section>

      {/* Categorias e itens */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Categorias e itens</h3>

        <form action="/api/cardapio/acao" method="POST" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="account_id" value={params.id} />
          <input type="hidden" name="acao" value="categoria_criar" />
          <input type="hidden" name="redirect_to" value={voltar} />
          <label className={`${CLASSE_RÓTULO} min-w-[180px] flex-1`}>
            Nova categoria
            <input name="nome" required maxLength={80} placeholder="Ex.: Entradas" className={CLASSE_CAMPO} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-neutral-300">
            <input type="checkbox" name="grade" value="1" className="accent-indigo-500" />
            Grade compacta (ex.: Diversos)
          </label>
          <button type="submit" className={CLASSE_BOTAO_SALVAR}>Criar categoria</button>
        </form>

        <div className="mt-5 flex flex-col gap-5">
          {categorias.length === 0 ? (
            <p className="text-sm text-neutral-500">Crie a primeira categoria para começar.</p>
          ) : null}

          {categorias.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-100">
                  {c.nome}
                  <span className="ml-2 text-xs font-normal text-neutral-500">{produtosDaCategoria(c.id).length} itens</span>
                </p>
                <form action="/api/cardapio/acao" method="POST">
                  <input type="hidden" name="account_id" value={params.id} />
                  <input type="hidden" name="acao" value="categoria_layout" />
                  <input type="hidden" name="categoria_id" value={c.id} />
                  <input type="hidden" name="layout" value={c.layout === "grade" ? "lista" : "grade"} />
                  <input type="hidden" name="redirect_to" value={voltar} />
                  <button type="submit" className={CLASSE_BOTAO_SMALL}>{c.layout === "grade" ? "Usar lista" : "Usar grade compacta"}</button>
                </form>
                <form action="/api/cardapio/acao" method="POST">
                  <input type="hidden" name="account_id" value={params.id} />
                  <input type="hidden" name="acao" value="categoria_excluir" />
                  <input type="hidden" name="categoria_id" value={c.id} />
                  <input type="hidden" name="redirect_to" value={voltar} />
                  <button type="submit" className={CLASSE_BOTAO_PERIGO}>Excluir categoria</button>
                </form>
              </div>

              <ul className="mt-3 flex flex-col gap-2">
                {produtosDaCategoria(c.id).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-white/5" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${p.disponivel ? "text-neutral-100" : "text-neutral-500 line-through"}`}>{p.nome}</p>
                      <p className="text-xs text-neutral-500">
                        {reais(p.preco_centavos)}
                        {p.tags.length ? ` · ${p.tags.map((t) => ROTULOS_TAGS[t as keyof typeof ROTULOS_TAGS] ?? t).join(", ")}` : ""}
                      </p>
                    </div>
                    <form action="/api/cardapio/acao" method="POST">
                      <input type="hidden" name="account_id" value={params.id} />
                      <input type="hidden" name="acao" value="produto_disponivel" />
                      <input type="hidden" name="produto_id" value={p.id} />
                      <input type="hidden" name="disponivel" value={p.disponivel ? "0" : "1"} />
                      <input type="hidden" name="redirect_to" value={voltar} />
                      <button type="submit" className={CLASSE_BOTAO_SMALL}>{p.disponivel ? "Pausar" : "Ligar"}</button>
                    </form>
                    <form action="/api/cardapio/acao" method="POST">
                      <input type="hidden" name="account_id" value={params.id} />
                      <input type="hidden" name="acao" value="produto_excluir" />
                      <input type="hidden" name="produto_id" value={p.id} />
                      <input type="hidden" name="redirect_to" value={voltar} />
                      <button type="submit" className={CLASSE_BOTAO_PERIGO}>Excluir</button>
                    </form>
                  </li>
                ))}
              </ul>

              <form action="/api/cardapio/acao" method="POST" className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="account_id" value={params.id} />
                <input type="hidden" name="acao" value="produto_criar" />
                <input type="hidden" name="categoria_id" value={c.id} />
                <input type="hidden" name="redirect_to" value={voltar} />
                <label className={CLASSE_RÓTULO}>
                  Nome do item
                  <input name="nome" required maxLength={120} className={CLASSE_CAMPO} />
                </label>
                <label className={CLASSE_RÓTULO}>
                  Preço
                  <input name="preco" required inputMode="decimal" placeholder="0,00" className={CLASSE_CAMPO} />
                </label>
                <label className={`${CLASSE_RÓTULO} sm:col-span-2`}>
                  Descrição (opcional)
                  <textarea name="descricao" rows={2} maxLength={500} className={CLASSE_CAMPO} />
                </label>
                <label className={`${CLASSE_RÓTULO} sm:col-span-2`}>
                  Foto (opcional, caminho /cardapio-fotos/… ou link https://)
                  <input name="foto_url" maxLength={400} className={CLASSE_CAMPO} />
                </label>
                <fieldset className="sm:col-span-2 flex flex-wrap gap-2">
                  {TAGS_CARDAPIO.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                      <input type="checkbox" name="tags" value={t} className="accent-indigo-500" />
                      {ROTULOS_TAGS[t]}
                    </label>
                  ))}
                </fieldset>
                <button type="submit" className={`${CLASSE_BOTAO_SALVAR} sm:col-span-2`}>Adicionar item em {c.nome}</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
