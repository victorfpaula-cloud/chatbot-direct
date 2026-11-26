"use client";

// Vitrine do cardápio público: mesmo visual e comportamento do protótipo aprovado.
// Os dados chegam prontos do servidor (page.tsx). Aqui só há interação: abertura,
// carrosséis, barra com categorias, busca, popup do item e botão de voltar ao topo.

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CSS_VITRINE } from "./vitrine-estilo";

export type TagVitrine = { chave: string; rotulo: string };

export type ItemVitrine = {
  chave: string; // "p12" = produto, "h3" = promoção ou destaque
  nome: string;
  descricao: string;
  precoCentavos: number;
  promoCentavos: number | null;
  foto: string;
  tags: TagVitrine[];
  disponivel: boolean;
  categoria: string;
  prazo: string; // só para promoções e destaques; vazio nos demais
  destaque: boolean;
  adicionais: GrupoVitrine[];
  /** Tabela de adicionais recolhida num dropdown (marcado por categoria no painel). */
  adicionaisDropdown: boolean;
};

export type GrupoVitrine = {
  nome: string;
  itens: { nome: string; precoCentavos: number }[];
};

export type CategoriaVitrine = {
  id: string;
  nome: string;
  descricao: string;
  layout: "lista" | "lista_elegante" | "duas_colunas" | "grade";
  itens: ItemVitrine[];
};

export type VitrineDados = {
  nome: string;
  tagline: string;
  corDestaque: string;
  promocoes: ItemVitrine[];
  destaques: ItemVitrine[];
  categorias: CategoriaVitrine[];
};

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const HUE_STEPS = [0, 18, -18, 36, -36, 54, -54];
const INTRO_MIN_MS = 1100;
const INTRO_MAX_MS = 2600;
const AUTOPLAY_MS = 5000;

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function hexParaMatiz(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  if (!m) return 16;
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

function Precos({ item }: { item: ItemVitrine }) {
  return item.promoCentavos != null ? (
    <>
      <span className="slide__price-now">{dinheiro.format(item.promoCentavos / 100)}</span>
      <s>{dinheiro.format(item.precoCentavos / 100)}</s>
    </>
  ) : (
    <span className="slide__price-now">{dinheiro.format(item.precoCentavos / 100)}</span>
  );
}

function Tags({ tags }: { tags: TagVitrine[] }) {
  if (!tags.length) return null;
  return (
    <div className="tags">
      {tags.map((t) => (
        <span key={t.chave} className={`tag tag--${t.chave}`}>{t.rotulo}</span>
      ))}
    </div>
  );
}

function Midia({ item, classe }: { item: ItemVitrine; classe: string }) {
  return item.foto ? (
    <img className={classe} src={item.foto} alt="" loading="lazy" decoding="async" />
  ) : (
    <span className="placeholder" aria-hidden="true">{iniciais(item.nome)}</span>
  );
}

function Carrossel({
  tipo,
  tag,
  titulo,
  itens,
  onAbrir,
}: {
  tipo: "promo" | "featured";
  tag: string;
  titulo: string;
  itens: ItemVitrine[];
  onAbrir: (chave: string) => void;
}) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const raizRef = useRef<HTMLElement>(null);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const trilho = trilhoRef.current;
    const raiz = raizRef.current;
    if (!trilho || !raiz) return;
    const slides = [...trilho.children] as HTMLElement[];
    let pausado = false;
    let retomar: ReturnType<typeof setTimeout> | null = null;
    let indiceAtual = 0;

    const passo = () => (slides[0]?.offsetWidth ?? 0) + 12;
    const atual = () => Math.round(trilho.scrollLeft / Math.max(1, passo())) || 0;

    const mostrar = (i: number) => {
      const proximo = (i + slides.length) % slides.length;
      trilho.scrollTo({ left: Math.max(0, slides[proximo].offsetLeft - 16), behavior: "smooth" });
      indiceAtual = proximo;
      setIndice(proximo);
    };
    const pausar = (ms = 0) => {
      pausado = true;
      if (retomar) clearTimeout(retomar);
      if (ms) retomar = setTimeout(() => { pausado = false; }, ms);
    };
    const tick = () => {
      if (pausado || document.hidden || !raiz.isConnected) return;
      mostrar(atual() + 1);
    };

    const aoRolar = () => {
      const i = atual();
      if (i !== indiceAtual) { indiceAtual = i; setIndice(i); }
    };
    const aoApontar = () => pausar();
    const aoSoltar = () => pausar(4000);
    const aoFoco = () => pausar();
    const aoSairFoco = () => pausar(2000);
    const aoEntrar = () => pausar();
    const aoSair = () => pausar(1500);

    trilho.addEventListener("scroll", aoRolar, { passive: true });
    trilho.addEventListener("pointerdown", aoApontar);
    trilho.addEventListener("pointerup", aoSoltar);
    trilho.addEventListener("pointercancel", aoSoltar);
    trilho.addEventListener("focusin", aoFoco);
    trilho.addEventListener("focusout", aoSairFoco);
    raiz.addEventListener("mouseenter", aoEntrar);
    raiz.addEventListener("mouseleave", aoSair);

    const timer = slides.length > 1 ? setInterval(tick, AUTOPLAY_MS) : null;
    const pontos = raiz.querySelectorAll<HTMLButtonElement>("[data-dot]");
    const aoPonto = (e: Event) => {
      const i = Number((e.currentTarget as HTMLElement).dataset.dot);
      pausar(6000);
      mostrar(i);
    };
    pontos.forEach((p) => p.addEventListener("click", aoPonto));

    return () => {
      if (timer) clearInterval(timer);
      if (retomar) clearTimeout(retomar);
      trilho.removeEventListener("scroll", aoRolar);
      trilho.removeEventListener("pointerdown", aoApontar);
      trilho.removeEventListener("pointerup", aoSoltar);
      trilho.removeEventListener("pointercancel", aoSoltar);
      trilho.removeEventListener("focusin", aoFoco);
      trilho.removeEventListener("focusout", aoSairFoco);
      raiz.removeEventListener("mouseenter", aoEntrar);
      raiz.removeEventListener("mouseleave", aoSair);
      pontos.forEach((p) => p.removeEventListener("click", aoPonto));
    };
  }, [itens.length]);

  return (
    <section ref={raizRef} className={`cx cx--${tipo === "promo" ? "promo" : "featured"}`} aria-roledescription="carrossel" aria-label={titulo}>
      <header className="cx__head">
        <div>
          <span className="cx__tag">{tag}</span>
          <h2>{titulo}</h2>
        </div>
        <span className="cx__count" aria-live="polite"><b>{indice + 1}</b> / {itens.length}</span>
      </header>
      <div ref={trilhoRef} className="cx__track" tabIndex={0}>
        {itens.map((h) => (
          <article
            key={h.chave}
            className="slide"
            role="button"
            tabIndex={0}
            aria-label={`Ver ${h.nome}`}
            onClick={() => onAbrir(h.chave)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(h.chave); }
            }}
          >
            <div className="slide__media">
              {h.foto ? (
                <img src={h.foto} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="slide__initials" aria-hidden="true">{iniciais(h.nome)}</span>
              )}
            </div>
            <div className="slide__shade" aria-hidden="true" />
            <div className="slide__top">
              <span className="slide__chip">{h.categoria}</span>
              <span className="slide__chip slide__chip--time">{h.prazo}</span>
            </div>
            <div className="slide__body">
              <h3>{h.nome}</h3>
              {h.descricao ? <p>{h.descricao}</p> : null}
              <div className="slide__price"><Precos item={h} /></div>
            </div>
          </article>
        ))}
      </div>
      {itens.length > 1 ? (
        <div className="cx__dots" role="group" aria-label="Escolher destaque">
          {itens.map((_, i) => (
            <button key={i} type="button" data-dot={i} aria-current={i === indice ? "true" : "false"} aria-label={`Mostrar ${i + 1} de ${itens.length}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function Vitrine({ dados }: { dados: VitrineDados }) {
  const { nome, tagline, corDestaque, promocoes, destaques, categorias } = dados;
  const raizRef = useRef<HTMLDivElement>(null);
  const progressoRef = useRef<HTMLSpanElement>(null);
  const campoBuscaRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const indiceRef = useRef<HTMLDialogElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);

  const [fase, setFase] = useState<"intro" | "saindo" | "pronto">("intro");
  const [introAtiva, setIntroAtiva] = useState(true);
  const [busca, setBusca] = useState(false);
  const [termo, setTermo] = useState("");
  const [ativa, setAtiva] = useState<string | null>(null);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [topoVisivel, setTopoVisivel] = useState(false);
  const [aberto, setAberto] = useState<ItemVitrine | null>(null);

  const matiz = useMemo(() => hexParaMatiz(corDestaque), [corDestaque]);
  const corDaSecao = (i: number) => `hsl(${(matiz + HUE_STEPS[i % HUE_STEPS.length] + 360) % 360} 66% 46%)`;

  const visiveis = useMemo(() => categorias.filter((c) => c.itens.length > 0), [categorias]);

  const registro = useMemo(() => {
    const m = new Map<string, ItemVitrine>();
    visiveis.forEach((c) => c.itens.forEach((i) => m.set(i.chave, i)));
    promocoes.forEach((i) => m.set(i.chave, i));
    destaques.forEach((i) => m.set(i.chave, i));
    return m;
  }, [visiveis, promocoes, destaques]);

  // Abertura: cortina com anéis, uma vez por aba. Respeita "reduzir movimento".
  useEffect(() => {
    const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visto = false;
    try { visto = sessionStorage.getItem("cardapio-intro") === "1"; } catch { visto = false; }
    if (movimentoReduzido || visto) {
      setIntroAtiva(false);
      setFase("pronto");
      return;
    }
    const inicio = performance.now();
    let feito = false;
    const terminar = () => {
      if (feito) return;
      feito = true;
      setFase("saindo");
      try { sessionStorage.setItem("cardapio-intro", "1"); } catch { /* sem armazenamento */ }
      setTimeout(() => { setIntroAtiva(false); setFase("pronto"); }, 700);
    };
    const espera = Math.max(0, INTRO_MIN_MS - (performance.now() - inicio));
    const t1 = setTimeout(terminar, espera);
    const t2 = setTimeout(terminar, INTRO_MAX_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Título da aba e cor do navegador (mobile), como no protótipo.
  useEffect(() => {
    document.title = nome;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = corDestaque;
  }, [nome, corDestaque]);

  // Barra de progresso de leitura e botão de voltar ao topo.
  useEffect(() => {
    const aoRolar = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const fracao = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (progressoRef.current) progressoRef.current.style.transform = `scaleX(${fracao})`;
      setTopoVisivel(window.scrollY >= 600);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Categoria ativa na barra, conforme a seção que está na tela.
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz || busca) return;
    const secoes = raiz.querySelectorAll<HTMLElement>("[data-section]");
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) setAtiva(e.target.id); });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    secoes.forEach((s) => observador.observe(s));
    return () => observador.disconnect();
  }, [visiveis, busca]);

  // Indicador sob a aba da seção atual; a aba é mantida à vista na faixa.
  useEffect(() => {
    const abas = tabsRef.current;
    const indicador = inkRef.current;
    if (!abas || !indicador || busca) return;
    const id = ativa ?? (visiveis[0] ? `cat-${visiveis[0].id}` : null);
    const aba = id ? abas.querySelector<HTMLElement>(`[data-tab="${id}"]`) : null;
    if (!aba) return;
    indicador.style.width = `${aba.offsetWidth}px`;
    indicador.style.transform = `translateX(${aba.offsetLeft}px)`;
    aba.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [ativa, visiveis, busca]);

  // Gaveta de categorias.
  useEffect(() => {
    const gaveta = indiceRef.current;
    if (!gaveta) return;
    if (indiceAberto && !gaveta.open) gaveta.showModal();
    if (!indiceAberto && gaveta.open) gaveta.close();
  }, [indiceAberto]);

  // Popup do item.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (aberto && !dlg.open) dlg.showModal();
    if (!aberto && dlg.open) dlg.close();
  }, [aberto]);

  useEffect(() => {
    if (busca) campoBuscaRef.current?.focus();
  }, [busca]);

  const abrir = (chave: string) => {
    const item = registro.get(chave);
    if (item) setAberto(item);
  };

  const fecharBusca = () => { setBusca(false); setTermo(""); };

  // Filtro da busca: nome, descrição e tags.
  const consulta = normalizar(termo.trim());
  const secoesFiltradas = visiveis.map((c) => {
    const itens = consulta
      ? c.itens.filter((i) => normalizar([i.nome, i.descricao, ...i.tags.map((t) => t.rotulo)].join(" ")).includes(consulta))
      : c.itens;
    return { ...c, filtrados: itens };
  });
  const algumResultado = secoesFiltradas.some((c) => c.filtrados.length > 0);
  const mostrarDestaques = !consulta && (promocoes.length > 0 || destaques.length > 0);

  const introLetras = nome.split("").map((ch, i) => (
    <span key={i} style={{ ["--i" as string]: i }}>{ch === " " ? " " : ch}</span>
  ));

  const classeRaiz = ["cdv", fase === "intro" ? "intro-on" : "", fase !== "intro" ? "is-ready" : ""].filter(Boolean).join(" ");

  return (
    <div ref={raizRef} className={classeRaiz} style={{ ["--accent" as string]: corDestaque }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_VITRINE }} />

      {introAtiva ? (
        <div className={`intro${fase === "saindo" ? " is-out" : ""}`} aria-hidden="true">
          <span className="intro__ring" /><span className="intro__ring" /><span className="intro__ring" />
          <p className="intro__name">{introLetras}</p>
          <span className="intro__bar"><i /></span>
        </div>
      ) : null}

      <div className="progress" aria-hidden="true"><span ref={progressoRef} /></div>

      <header className="hero">
        <div className="hero__inner">
          {tagline ? <p className="hero__eyebrow">{tagline}</p> : null}
          <h1 className="hero__title">{nome}</h1>
        </div>
      </header>

      <section className="highlights" aria-label="Promoções e destaques" hidden={!mostrarDestaques}>
        {promocoes.length > 0 && !consulta ? (
          <Carrossel tipo="promo" tag="Promoção do dia" titulo="Hoje tem desconto" itens={promocoes} onAbrir={abrir} />
        ) : null}
        {destaques.length > 0 && !consulta ? (
          <Carrossel tipo="featured" tag="Destaque" titulo="Escolhidos pela casa" itens={destaques} onAbrir={abrir} />
        ) : null}
      </section>

      <nav className="bar" aria-label="Navegação do cardápio">
        <div className="bar__inner">
          <div className="bar__row">
            <div className="tabs" ref={tabsRef} hidden={busca} role="navigation" aria-label="Categorias">
              {visiveis.map((c) => {
                const id = `cat-${c.id}`;
                const ativo = (ativa ?? (visiveis[0] ? `cat-${visiveis[0].id}` : null)) === id;
                return (
                  <a
                    key={c.id}
                    data-tab={id}
                    className={`tab${ativo ? " is-active" : ""}`}
                    href={`#${id}`}
                    aria-current={ativo ? "true" : undefined}
                    hidden={secoesFiltradas.find((s) => s.id === c.id)?.filtrados.length === 0}
                    onClick={(e) => {
                      e.preventDefault();
                      try { navigator.vibrate?.(8); } catch { /* sem suporte */ }
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {c.nome}
                  </a>
                );
              })}
              <span className="tabs__ink" ref={inkRef} aria-hidden="true" />
            </div>
            <label className="bar__field" hidden={!busca}>
              <span className="sr-only">Buscar no cardápio</span>
              <svg className="bar__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input
                ref={campoBuscaRef}
                type="search"
                placeholder="Buscar pratos, bebidas, ingredientes…"
                autoComplete="off"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") fecharBusca(); }}
              />
            </label>
            <button className="bar__btn" type="button" aria-label="Buscar no cardápio" aria-expanded={busca} hidden={busca} onClick={() => setBusca(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <button className="bar__btn" type="button" aria-label="Ver todas as categorias" hidden={busca} onClick={() => setIndiceAberto(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
            <button className="bar__btn" type="button" aria-label="Fechar busca" hidden={!busca} onClick={fecharBusca}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="menu" aria-live="polite">
        {secoesFiltradas.map((c, i) => {
          const classeGrade = c.layout === "grade" ? "grid--4" : c.layout === "duas_colunas" ? "grid--2" : "grid";
          return (
            <section
              key={c.id}
              id={`cat-${c.id}`}
              className="section"
              data-section
              hidden={c.filtrados.length === 0}
              style={{ ["--c" as string]: corDaSecao(i) }}
              aria-labelledby={`h-${c.id}`}
            >
              <header className="section__head">
                <div>
                  <h2 id={`h-${c.id}`}>{c.nome}</h2>
                  {c.descricao ? <p>{c.descricao}</p> : null}
                </div>
                <span className="section__count">{plural(c.itens.length, "item", "itens")}</span>
              </header>
              {c.layout === "lista_elegante" ? (
                <ul className="lista-elegante">
                  {c.filtrados.map((item) => (
                    <li key={item.chave} className={item.disponivel ? undefined : "is-off"}>
                      <button className="le__btn" type="button" onClick={() => abrir(item.chave)} aria-label={`Ver detalhes de ${item.nome}`}>
                        <div className="le__media">
                          <Midia item={item} classe="" />
                        </div>
                        <div className="le__main">
                          <h3 className="le__nome">{item.nome}</h3>
                          {item.descricao ? <p className="le__desc">{item.descricao}</p> : null}
                        </div>
                        <div className="le__preco">
                          <span className="price">{dinheiro.format(item.precoCentavos / 100)}</span>
                          {item.disponivel ? null : <span className="le__off">Indisponível</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
              <div className={classeGrade}>
                {c.filtrados.map((item) => (
                  <article key={item.chave} className={`card${item.disponivel ? "" : " is-off"}`}>
                    <button className="card__btn" type="button" onClick={() => abrir(item.chave)} aria-label={`Ver detalhes de ${item.nome}`}>
                      <div className="card__media">
                        <Midia item={item} classe="" />
                        {item.disponivel ? null : <span className="badge-off">Indisponível</span>}
                      </div>
                      <div className="card__body">
                        <h3 className="card__title">{item.nome}</h3>
                        {item.descricao ? <p className="card__desc">{item.descricao}</p> : null}
                        <div className="card__foot">
                          <span className="price">{dinheiro.format(item.precoCentavos / 100)}</span>
                        </div>
                        <Tags tags={item.tags.slice(0, 2)} />
                      </div>
                    </button>
                  </article>
                ))}
              </div>
              )}
            </section>
          );
        })}
        {!algumResultado && consulta ? (
          <div className="empty">Nada encontrado para essa busca.</div>
        ) : null}
        {visiveis.length === 0 ? (
          <div className="empty">O cardápio está sendo preparado. Volte em instantes.</div>
        ) : null}
      </main>

      <footer className="footer" />

      <button
        className="to-top"
        type="button"
        aria-label="Voltar ao topo"
        hidden={!topoVisivel}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      <dialog
        ref={indiceRef}
        className="sheet"
        aria-labelledby="sheet-titulo"
        onClick={(e) => { if (e.target === indiceRef.current) indiceRef.current?.close(); }}
        onClose={() => setIndiceAberto(false)}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id="sheet-titulo">Categorias</h2>
          <button className="sheet__close" type="button" aria-label="Fechar" onClick={() => indiceRef.current?.close()}>×</button>
        </header>
        <div className="sheet__grid">
          {visiveis.map((c, i) => {
            const com = c.itens.find((x) => x.foto);
            return (
              <button
                key={c.id}
                type="button"
                className="tile"
                style={{ ["--c" as string]: corDaSecao(i) }}
                onClick={() => {
                  indiceRef.current?.close();
                  document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="tile__media">
                  {com ? <img src={com.foto} alt="" loading="lazy" decoding="async" /> : <span className="tile__ini" aria-hidden="true">{iniciais(c.nome)}</span>}
                </span>
                <span className="tile__txt">
                  <strong>{c.nome}</strong>
                  <small>{plural(c.itens.length, "item", "itens")}</small>
                </span>
              </button>
            );
          })}
        </div>
      </dialog>

      <dialog
        ref={dialogRef}
        className="item-dialog"
        aria-labelledby="item-dialog-title"
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
        onClose={() => setAberto(null)}
      >
        <button className="item-dialog__close" type="button" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        {aberto ? (
          <>
            <div className="item-dialog__media">
              {aberto.foto ? <img src={aberto.foto} alt="" /> : <span className="placeholder" aria-hidden="true">{iniciais(aberto.nome)}</span>}
            </div>
            <div className="item-dialog__content">
              {aberto.destaque ? <span className="cx__tag">{aberto.categoria}</span> : null}
              <h2 className="item-dialog__title" id="item-dialog-title">{aberto.nome}</h2>
              {aberto.descricao ? <p className="item-dialog__desc">{aberto.descricao}</p> : null}
              <Tags tags={aberto.tags} />
              <div className="item-dialog__foot">
                <span className="item-dialog__price">
                  {aberto.promoCentavos != null ? (
                    <>
                      <span className="price price--promo">{dinheiro.format(aberto.promoCentavos / 100)}</span>
                      <s className="price-old">{dinheiro.format(aberto.precoCentavos / 100)}</s>
                    </>
                  ) : (
                    <span className="price">{dinheiro.format(aberto.precoCentavos / 100)}</span>
                  )}
                </span>
                {aberto.disponivel ? null : <span className="badge-off">Indisponível no momento</span>}
              </div>
              {aberto.adicionais.length > 0 ? (
                <div className="item-dialog__adicionais">
                  {aberto.adicionaisDropdown ? (
                    <details className="ad-dropdown">
                      <summary className="ad-dropdown__resumo">
                        <span className="ad-dropdown__titulo">Adicionais</span>
                        <span className="ad-dropdown__qtd">
                          {aberto.adicionais.reduce((n, g) => n + g.itens.length, 0)} opções
                        </span>
                        <span className="ad-dropdown__seta" aria-hidden="true">▾</span>
                      </summary>
                      <table className="ad-tabela">
                    <tbody>
                      {aberto.adicionais.map((g) => (
                        <Fragment key={g.nome}>
                          <tr className="ad-tabela__grupo">
                            <th colSpan={2} scope="colgroup">{g.nome}</th>
                          </tr>
                          {g.itens.map((i) => (
                            <tr key={i.nome}>
                              <td>{i.nome}</td>
                              <td>+ {dinheiro.format(i.precoCentavos / 100)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                      </details>
                  ) : (
                    <>
                      <p className="item-dialog__adicionais-titulo">Adicionais</p>
                      <table className="ad-tabela">
                        <tbody>
                          {aberto.adicionais.map((g) => (
                            <Fragment key={g.nome}>
                              <tr className="ad-tabela__grupo">
                                <th colSpan={2} scope="colgroup">{g.nome}</th>
                              </tr>
                              {g.itens.map((i) => (
                                <tr key={i.nome}>
                                  <td>{i.nome}</td>
                                  <td>+ {dinheiro.format(i.precoCentavos / 100)}</td>
                                </tr>
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              ) : null}
              {aberto.destaque && aberto.prazo ? <p className="item-dialog__note">{aberto.prazo}</p> : null}
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
