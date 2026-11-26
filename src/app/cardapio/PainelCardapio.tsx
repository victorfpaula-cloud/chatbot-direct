import type { ReactNode } from "react";
import { ICONES_CATEGORIA, IconeCategoria } from "@/lib/icones-categoria";
import {
  FUSO_CARDAPIO,
  LAYOUTS,
  PRAZOS,
  ROTULOS_TAGS,
  ROTULO_LAYOUT,
  TAGS_CARDAPIO,
  type Adicional,
  type Categoria,
  type Conta,
  type Destaque,
  type GrupoAdicional,
  type Produto,
  type VinculoAdicional,
} from "@/lib/cardapio";
import {
  CLASSE_AJUDA,
  CLASSE_BOTAO_SALVAR,
  CLASSE_CAMPO,
  CLASSE_RÓTULO,
  CLASSE_SECAO,
  CLASSE_TITULO_SECAO,
} from "@/app/contas/[id]/estilosDeCampo";

// Painel de edição do cardápio. Usado tanto pelo painel de contas (você) quanto pelo dono do
// restaurante (/cardapio/[slug]/adm). A diferença é só para onde os formulários enviam.

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO_CARDAPIO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Galeria de ícones: toca num ícone para escolher a categoria. Usada ao criar e ao editar. */
function GaleriaIcones({ atual }: { atual?: string }) {
  const classeOpcao =
    "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-black/20 px-1 py-2 transition peer-checked:border-indigo-400 peer-checked:bg-indigo-500/15 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400";
  return (
    <fieldset className="flex flex-col gap-2 sm:col-span-2">
      <legend className={CLASSE_RÓTULO}>Ícone da categoria</legend>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        <label className="contents">
          <input type="radio" name="icone" value="" defaultChecked={!atual} className="peer sr-only" />
          <span className={classeOpcao}>
            <span className="text-xs text-neutral-400">Nenhum</span>
          </span>
        </label>
        {ICONES_CATEGORIA.map((i) => (
          <label key={i.chave} className="contents" title={i.rotulo}>
            <input type="radio" name="icone" value={i.chave} defaultChecked={atual === i.chave} className="peer sr-only" />
            <span className={classeOpcao}>
              <IconeCategoria chave={i.chave} className="h-6 w-6 text-neutral-200" />
              <span className="w-full truncate text-center text-[10px] text-neutral-400">{i.rotulo}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const BOTAO_PEQUENO =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/[0.08]";
const BOTAO_PERIGO =
  "rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/60";

export function PainelCardapio({
  actionUrl,
  accountId,
  slug,
  voltar,
  conta,
  categorias,
  produtos,
  destaques,
  grupos,
  adicionais,
  vinculos,
}: {
  /** Para onde os formulários enviam (rota do painel de contas ou rota do dono). */
  actionUrl: string;
  accountId: string;
  slug: string | null;
  /** Para onde volta depois de salvar (só usado pelo painel de contas). */
  voltar: string;
  conta: Conta | null;
  categorias: Categoria[];
  produtos: Produto[];
  destaques: Destaque[];
  grupos: GrupoAdicional[];
  adicionais: Adicional[];
  vinculos: VinculoAdicional[];
}) {
  const produtosDaCategoria = (categoriaId: string) => produtos.filter((p) => p.categoria_id === categoriaId);
  const nomeDoProduto = (produtoId: string) => produtos.find((p) => p.id === produtoId)?.nome ?? "Item removido";

  // Campos que todos os formulários enviam. Cada rota usa só o que precisa.
  const ocultos = (
    <>
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="slug" value={slug ?? ""} />
      <input type="hidden" name="redirect_to" value={voltar} />
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Dados do cardápio */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Dados do cardápio</h3>
        <form action={actionUrl} method="POST" className="mt-4 flex flex-col gap-3">
          {ocultos}
          <input type="hidden" name="acao" value="conta_salvar" />
          <label className={CLASSE_RÓTULO}>
            Nome que aparece no cardápio
            <input name="nome_exibicao" required maxLength={120} defaultValue={conta?.nome_exibicao} className={CLASSE_CAMPO} />
          </label>
          <label className={CLASSE_RÓTULO}>
            Frase de boas-vindas (opcional)
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
                <form action={actionUrl} method="POST">
                  {ocultos}
                  <input type="hidden" name="acao" value="destaque_remover" />
                  <input type="hidden" name="destaque_id" value={d.id} />
                  <button type="submit" className={BOTAO_PEQUENO}>Encerrar agora</button>
                </form>
              </div>
            ))
          )}
        </div>

        {produtos.length > 0 ? (
          <form action={actionUrl} method="POST" className="mt-4 grid gap-3 sm:grid-cols-2">
            {ocultos}
            <input type="hidden" name="acao" value="destaque_criar" />
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

        <form action={actionUrl} method="POST" className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          {ocultos}
          <input type="hidden" name="acao" value="categoria_criar" />
          <label className={CLASSE_RÓTULO}>
            Nova categoria
            <input name="nome" required maxLength={80} placeholder="Ex.: Bebidas" className={CLASSE_CAMPO} />
          </label>
          <label className={CLASSE_RÓTULO}>
            Layout
            <select name="layout" defaultValue="lista" className={CLASSE_CAMPO}>
              {LAYOUTS.map((l) => (
                <option key={l} value={l}>{ROTULO_LAYOUT[l]}</option>
              ))}
            </select>
          </label>
          <GaleriaIcones />
          <button type="submit" className={`${CLASSE_BOTAO_SALVAR} sm:col-span-2`}>Criar categoria</button>
        </form>

        <div className="mt-5 flex flex-col gap-5">
          {categorias.length === 0 ? <p className="text-sm text-neutral-500">Crie a primeira categoria para começar.</p> : null}

          {categorias.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-100">
                  {c.nome}
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    {produtosDaCategoria(c.id).length} itens · {ROTULO_LAYOUT[c.layout]}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={actionUrl} method="POST" className="flex items-center gap-2">
                    {ocultos}
                    <input type="hidden" name="acao" value="categoria_layout" />
                    <input type="hidden" name="categoria_id" value={c.id} />
                    <select name="layout" defaultValue={c.layout} className="rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-neutral-200">
                      {LAYOUTS.map((l) => (
                        <option key={l} value={l}>{ROTULO_LAYOUT[l]}</option>
                      ))}
                    </select>
                    <button type="submit" className={BOTAO_PEQUENO}>Salvar layout</button>
                  </form>
                  <form action={actionUrl} method="POST" className="flex items-center gap-2">
                    {ocultos}
                    <input type="hidden" name="acao" value="categoria_dropdown" />
                    <input type="hidden" name="categoria_id" value={c.id} />
                    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        name="dropdown"
                        value="1"
                        defaultChecked={c.dropdown_no_cardapio}
                        className="accent-indigo-500"
                      />
                      Recolher no cardápio (dropdown)
                    </label>
                    <button type="submit" className={BOTAO_PEQUENO}>Salvar</button>
                  </form>
                  <form action={actionUrl} method="POST">
                    {ocultos}
                    <input type="hidden" name="acao" value="categoria_excluir" />
                    <input type="hidden" name="categoria_id" value={c.id} />
                    <button type="submit" className={BOTAO_PERIGO}>Excluir categoria</button>
                  </form>
                </div>
              </div>

              <details className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3">
                <summary className="cursor-pointer list-none text-xs font-medium text-neutral-300">
                  Ícone da categoria: <IconeCategoria chave={c.icone} className="inline h-4 w-4 align-[-3px] text-neutral-200" /> · trocar
                </summary>
                <form action={actionUrl} method="POST" className="mt-3 grid gap-3 sm:grid-cols-2">
                  {ocultos}
                  <input type="hidden" name="acao" value="categoria_icone" />
                  <input type="hidden" name="categoria_id" value={c.id} />
                  <GaleriaIcones atual={c.icone} />
                  <button type="submit" className={`${CLASSE_BOTAO_SALVAR} sm:col-span-2`}>Salvar ícone</button>
                </form>
              </details>

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
                    <form action={actionUrl} method="POST">
                      {ocultos}
                      <input type="hidden" name="acao" value="produto_disponivel" />
                      <input type="hidden" name="produto_id" value={p.id} />
                      <input type="hidden" name="disponivel" value={p.disponivel ? "0" : "1"} />
                      <button type="submit" className={BOTAO_PEQUENO}>{p.disponivel ? "Pausar" : "Ligar"}</button>
                    </form>
                    <form action={actionUrl} method="POST">
                      {ocultos}
                      <input type="hidden" name="acao" value="produto_excluir" />
                      <input type="hidden" name="produto_id" value={p.id} />
                      <button type="submit" className={BOTAO_PERIGO}>Excluir</button>
                    </form>
                  </li>
                ))}
              </ul>

              <form action={actionUrl} method="POST" className="mt-4 grid gap-3 sm:grid-cols-2">
                {ocultos}
                <input type="hidden" name="acao" value="produto_criar" />
                <input type="hidden" name="categoria_id" value={c.id} />
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
                <fieldset className="flex flex-wrap gap-2 sm:col-span-2">
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

      {/* Adicionais: um dropdown por grupo, com os itens e as configurações dentro */}
      <section className={CLASSE_SECAO}>
        <h3 className={CLASSE_TITULO_SECAO}>Adicionais</h3>
        <p className={CLASSE_AJUDA}>
          Crie um grupo por tipo de adicional (ex.: Queijos extras, Molhos). Cada grupo vale para uma categoria inteira ou só para os produtos que você escolher.
        </p>

        <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4" open={grupos.length === 0}>
          <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-100">+ Novo grupo de adicionais</summary>
          <FormGrupoAdicional
            actionUrl={actionUrl}
            ocultos={ocultos}
            categorias={categorias}
            produtos={produtos}
            produtosMarcados={[]}
          />
        </details>

        <div className="mt-3 flex flex-col gap-3">
          {grupos.map((g) => {
            const marcados = vinculos.filter((v) => v.grupo_id === g.id).map((v) => v.produto_id);
            const itensDoGrupo = adicionais.filter((a) => a.grupo_id === g.id);
            const alvo =
              g.escopo === "categoria"
                ? `Categoria inteira: ${categorias.find((c) => c.id === g.categoria_id)?.nome ?? "—"}`
                : `${marcados.length} ${marcados.length === 1 ? "produto" : "produtos"} específicos`;
            return (
              <details key={g.id} className="group rounded-xl border border-white/10 bg-black/20 p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-100">
                    {g.nome}
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      {itensDoGrupo.length} {itensDoGrupo.length === 1 ? "item" : "itens"} · {alvo}
                    </span>
                  </span>
                  <span className="text-xs text-neutral-500 group-open:hidden">Abrir ▾</span>
                  <span className="hidden text-xs text-neutral-500 group-open:inline">Fechar ▴</span>
                </summary>

                <div className="mt-4 flex flex-col gap-4">
                  {itensDoGrupo.length === 0 ? <p className="text-sm text-neutral-500">Nenhum item ainda. Adicione abaixo.</p> : null}
                  <ul className="flex flex-col gap-2">
                    {itensDoGrupo.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${a.disponivel ? "text-neutral-100" : "text-neutral-500 line-through"}`}>{a.nome}</p>
                          <p className="text-xs text-neutral-500">+ {reais(a.preco_centavos)}</p>
                        </div>
                        <form action={actionUrl} method="POST">
                          {ocultos}
                          <input type="hidden" name="acao" value="adicional_item_disponivel" />
                          <input type="hidden" name="adicional_id" value={a.id} />
                          <input type="hidden" name="disponivel" value={a.disponivel ? "0" : "1"} />
                          <button type="submit" className={BOTAO_PEQUENO}>{a.disponivel ? "Pausar" : "Ligar"}</button>
                        </form>
                        <form action={actionUrl} method="POST">
                          {ocultos}
                          <input type="hidden" name="acao" value="adicional_item_excluir" />
                          <input type="hidden" name="adicional_id" value={a.id} />
                          <button type="submit" className={BOTAO_PERIGO}>Excluir</button>
                        </form>
                      </li>
                    ))}
                  </ul>

                  <form action={actionUrl} method="POST" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    {ocultos}
                    <input type="hidden" name="acao" value="adicional_item_criar" />
                    <input type="hidden" name="grupo_id" value={g.id} />
                    <label className={CLASSE_RÓTULO}>
                      Nome do item
                      <input name="nome" required maxLength={120} placeholder="Ex.: Cheddar" className={CLASSE_CAMPO} />
                    </label>
                    <label className={CLASSE_RÓTULO}>
                      Preço
                      <input name="preco" required inputMode="decimal" placeholder="0,00" className={CLASSE_CAMPO} />
                    </label>
                    <button type="submit" className={CLASSE_BOTAO_SALVAR}>Adicionar item</button>
                  </form>

                  <details className="rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer list-none text-sm text-neutral-300">Configurações do grupo</summary>
                    <FormGrupoAdicional
                      actionUrl={actionUrl}
                      ocultos={ocultos}
                      categorias={categorias}
                      produtos={produtos}
                      grupo={g}
                      produtosMarcados={marcados}
                    />
                    <form action={actionUrl} method="POST" className="mt-3">
                      {ocultos}
                      <input type="hidden" name="acao" value="adicional_grupo_excluir" />
                      <input type="hidden" name="grupo_id" value={g.id} />
                      <button type="submit" className={BOTAO_PERIGO}>Excluir grupo inteiro</button>
                    </form>
                  </details>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Formulário de um grupo de adicionais: nome, onde vale (categoria inteira ou produtos marcados). */
function FormGrupoAdicional({
  actionUrl,
  ocultos,
  categorias,
  produtos,
  grupo,
  produtosMarcados,
}: {
  actionUrl: string;
  ocultos: ReactNode;
  categorias: Categoria[];
  produtos: Produto[];
  grupo?: GrupoAdicional;
  produtosMarcados: string[];
}) {
  return (
    <form action={actionUrl} method="POST" className="mt-4 flex flex-col gap-4">
      {ocultos}
      <input type="hidden" name="acao" value="adicional_grupo_salvar" />
      {grupo ? <input type="hidden" name="grupo_id" value={grupo.id} /> : null}

      <label className={CLASSE_RÓTULO}>
        Nome do grupo
        <input name="nome" required maxLength={80} defaultValue={grupo?.nome} placeholder="Ex.: Queijos extras" className={CLASSE_CAMPO} />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className={CLASSE_RÓTULO}>Onde vale</legend>

        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input type="radio" name="escopo" value="categoria" defaultChecked={!grupo || grupo.escopo === "categoria"} className="accent-indigo-500" />
          Uma categoria inteira
        </label>
        <select name="categoria_id" defaultValue={grupo?.categoria_id ?? categorias[0]?.id} className={CLASSE_CAMPO}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input type="radio" name="escopo" value="produtos" defaultChecked={grupo?.escopo === "produtos"} className="accent-indigo-500" />
          Só produtos específicos (marque na lista)
        </label>
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
          {produtos.length === 0 ? <p className="text-xs text-neutral-500">Cadastre um item para poder escolher aqui.</p> : null}
          {categorias.map((c) => {
            const dos = produtos.filter((p) => p.categoria_id === c.id);
            if (dos.length === 0) return null;
            return (
              <div key={c.id} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{c.nome}</p>
                <div className="flex flex-wrap gap-2">
                  {dos.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                      <input type="checkbox" name="produto_ids" value={p.id} defaultChecked={produtosMarcados.includes(p.id)} className="accent-indigo-500" />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" className={CLASSE_BOTAO_SALVAR}>{grupo ? "Salvar configurações" : "Criar grupo"}</button>
    </form>
  );
}
