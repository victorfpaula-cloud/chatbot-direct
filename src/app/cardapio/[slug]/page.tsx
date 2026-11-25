import { notFound } from "next/navigation";
import { FUSO_CARDAPIO, ROTULOS_TAGS, carregarCardapioPublico, type Produto, type Destaque } from "@/lib/cardapio";

// Cardápio público do restaurante. Rota pública (fora do login), só lê as tabelas cardapio_*.
// Visual seguindo o protótipo aprovado (artefato): cabeçalho, carrosséis, barra com categorias,
// lista com foto. Detalhes abrem em popup centralizado (link + :target, sem JavaScript).
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { robots: { index: false, follow: false } };

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diaDe = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_CARDAPIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function prazoDoDestaque(ate: string) {
  const ultimo = new Date(new Date(ate).getTime() - 1);
  if (diaDe(ultimo) === diaDe(new Date())) return "Termina hoje à meia-noite";
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_CARDAPIO, day: "2-digit", month: "2-digit" }).format(ultimo);
  return `Até ${data}, meia-noite`;
}

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

const CSS = `
.cd{--accent:#e4572e;--bg:#f7f4f2;--surface:#fff;--text:#1c1917;--muted:#6b635e;--border:#e9e2de;--radius:18px;--preco:#e4572e;
  min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.45;-webkit-font-smoothing:antialiased;padding-bottom:40px}
.cd *,.cd *::before,.cd *::after{box-sizing:border-box}
.cd img{display:block;max-width:100%}
.cd h1,.cd h2,.cd h3,.cd p{margin:0}
.cd a{color:inherit}
.cd summary{list-style:none}
/* cabeçalho */
.hero{color:#fff;padding:36px 16px 26px;background:radial-gradient(900px 300px at 85% -20%,rgba(255,255,255,.22),transparent 60%),linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#000))}
.hero__in{max-width:1120px;margin:0 auto}
.hero__eyebrow{opacity:.9;font-size:.92rem;margin-bottom:4px}
.hero__title{font-size:clamp(1.9rem,5vw,2.8rem);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.hero__meta{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.hero__meta li,.hero__meta a{color:inherit;text-decoration:none;background:rgba(255,255,255,.18);padding:5px 11px;border-radius:999px;font-size:.86rem}
/* carrosséis */
.highlights{padding-top:22px}
.cx{padding-bottom:6px}
.cx+.cx{margin-top:10px}
.cx__head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 16px 12px;max-width:1120px;margin:0 auto}
.cx__tag{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.cx--promo .cx__tag{color:#fff;background:var(--accent);padding:3px 9px;border-radius:999px}
.cx__head h2{font-size:1.3rem;font-weight:800;letter-spacing:-.02em;margin-top:6px}
.cx__count{font-size:.85rem;color:var(--muted);white-space:nowrap}
.cx__track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 16px 6px;scroll-padding:0 16px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.cx__track::-webkit-scrollbar{display:none}
.slide{position:relative;flex:0 0 min(74vw,280px);height:218px;scroll-snap-align:start;border-radius:24px;overflow:hidden;color:#fff;isolation:isolate;background:var(--accent);box-shadow:0 8px 20px rgba(0,0,0,.12);text-decoration:none;display:block}
.cx--featured .slide{background:color-mix(in srgb,var(--text) 80%,var(--accent))}
.slide__media,.slide__media img{position:absolute;inset:0;width:100%;height:100%}
.slide__media img{object-fit:cover}
.slide__ini{position:absolute;inset:0;display:grid;place-items:center;font-size:4rem;font-weight:800;color:rgba(255,255,255,.35)}
.slide__shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.78) 12%,rgba(0,0,0,.08) 58%,rgba(0,0,0,.18));z-index:-1}
.slide__top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:8px}
.slide__chip{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.92);color:#1c1917;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slide__chip--time{background:rgba(0,0,0,.45);color:#fff}
.slide__body{position:absolute;left:14px;right:14px;bottom:12px;display:flex;flex-direction:column;gap:3px}
.slide__body h3{font-size:1.1rem;font-weight:700;letter-spacing:-.01em;line-height:1.2}
.slide__body p{font-size:.8rem;opacity:.9;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.slide__price{display:flex;align-items:baseline;gap:8px;margin-top:2px;font-size:1.05rem;font-weight:800}
.slide__price s{opacity:.75;font-size:.92rem;font-weight:500}
@media (min-width:760px){.slide{flex-basis:300px;height:230px}}
/* barra fixa com todas as categorias */
.bar{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border-bottom:1px solid var(--border)}
.bar__in{max-width:1120px;margin:0 auto;padding:10px 16px}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.chipnav{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 11px;border-radius:999px;border:1px solid var(--border);background:#fff;color:var(--text);text-decoration:none;font-size:.84rem;font-weight:700;white-space:nowrap}
.chipnav:hover{border-color:var(--c)}
.chipnav b{font-size:.72rem;font-weight:800;padding:1px 6px;border-radius:999px;background:var(--border);color:var(--muted);font-variant-numeric:tabular-nums}
.chipnav:active{transform:scale(.97)}
/* seções */
.section{scroll-margin-top:150px;padding:26px 16px 0;max-width:1120px;margin:0 auto}
.section__head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:2px solid var(--c)}
.section__head h2{font-size:1.35rem;font-weight:800;letter-spacing:-.02em}
.section__head p{color:var(--muted);font-size:.9rem;margin-top:2px}
.section__count{font-size:.8rem;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
/* lista (1 coluna), 2 colunas e grade compacta */
.grid{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.gridc{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
@media (min-width:640px){.gridc{grid-template-columns:repeat(4,1fr);gap:12px}}
/* card */
a.card{display:flex;align-items:stretch;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px rgba(0,0,0,.06);text-decoration:none;color:inherit;min-width:0;transition:transform .2s ease}
a.card:active{transform:scale(.99)}
.card__media{position:relative;flex:0 0 104px;width:104px;min-height:104px;margin:10px 0 10px 10px;border-radius:14px;background:color-mix(in srgb,var(--c,var(--accent)) 16%,var(--border));overflow:hidden}
.card__media img{width:100%;height:100%;object-fit:cover}
.ph{width:100%;height:100%;display:grid;place-items:center;font-weight:800;font-size:1.4rem;color:var(--c,var(--accent))}
.card__body{padding:12px 14px 12px 12px;display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.card__title{font-size:.98rem;font-weight:700;line-height:1.25}
.card__desc{color:var(--muted);font-size:.85rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card__foot{margin-top:auto;padding-top:6px;display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap}
.price{font-weight:800;color:var(--preco);font-variant-numeric:tabular-nums;font-size:1rem}
.more{font-size:.72rem;font-weight:700;color:var(--muted)}
.badge-off{font-size:.7rem;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--border);color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.tags span{font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--accent)}
a.card.off .card__media img{filter:grayscale(1);opacity:.55}
a.card.off .card__title{color:var(--muted)}
/* cards pequenos (grade) */
.gridc a.card{flex-direction:column;padding:0}
.gridc .card__media{flex:none;width:100%;min-height:0;height:auto;aspect-ratio:1/1;margin:0;border-radius:0}
.gridc .card__body{padding:8px 10px 10px}
.gridc .card__title{font-size:.84rem;line-height:1.2}
.gridc .card__desc{display:none}
.gridc .price{font-size:.86rem}
/* 2 colunas */
.grid2 a.card{flex-direction:column}
.grid2 .card__media{flex:none;width:100%;min-height:0;height:auto;aspect-ratio:4/3;margin:0;border-radius:0}
.grid2 .card__body{padding:10px 12px 12px}
/* popup centralizado */
.modal{display:none;position:fixed;inset:0;z-index:60;align-items:center;justify-content:center;padding:16px}
.modal:target{display:flex}
.modal__bg{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.modal__box{position:relative;width:min(520px,100%);max-height:88vh;overflow:auto;background:var(--surface);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.3);animation:mpop .22s ease-out}
@keyframes mpop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.modal__x{position:absolute;top:12px;right:12px;z-index:2;width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;text-decoration:none;font-size:1.3rem;line-height:1}
.modal__img{position:relative;width:100%;aspect-ratio:4/3;background:color-mix(in srgb,var(--c,var(--accent)) 14%,var(--border))}
.modal__img img{width:100%;height:100%;object-fit:cover}
.modal__img .ph{position:absolute;inset:0;font-size:2.6rem}
.modal__body{padding:18px 20px 22px;display:flex;flex-direction:column;gap:10px}
.modal__title{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.modal__body p{color:var(--muted);line-height:1.5}
.modal__foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:4px}
.modal__foot .price{font-size:1.25rem}
.foot{max-width:1120px;margin:0 auto;padding:30px 16px 10px;text-align:center;color:var(--muted);font-size:.85rem}
@media (prefers-reduced-motion:reduce){.cd *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

export default async function CardapioPublicoPage({ params }: { params: { slug: string } }) {
  const dados = await carregarCardapioPublico(params.slug);
  if (!dados) notFound();

  const { conta, categorias, produtos, destaques, corDestaque, nomeConta } = dados;
  const nome = conta.nome_exibicao || nomeConta;
  const porCategoria = (id: string) => produtos.filter((p) => p.categoria_id === id);
  const promos = destaques.filter((d) => d.tipo === "promo");
  const escolhidos = destaques.filter((d) => d.tipo === "destaque");
  const produtoDe = (d: Destaque) => produtos.find((p) => p.id === d.produto_id);
  const categoriasComItens = categorias.filter((c) => porCategoria(c.id).length > 0);
  const nomeDaCategoria = (id: string) => categoriasComItens.find((c) => c.id === id)?.nome ?? "";
  const corDaSecao = (i: number) => `hsl(${(i * 37) % 360} 60% 42%)`;

  const slide = (d: Destaque, tipo: string) => {
    const p = produtoDe(d);
    if (!p) return null;
    return (
      <a key={d.id} href={`#p${p.id}`} className="slide">
        <div className="slide__media">
          {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span className="slide__ini">{iniciais(p.nome)}</span>}
        </div>
        <div className="slide__shade" />
        <div className="slide__top">
          <span className="slide__chip">{nomeDaCategoria(p.categoria_id)}</span>
          <span className="slide__chip slide__chip--time">{prazoDoDestaque(d.ate)}</span>
        </div>
        <div className="slide__body">
          <span className="cx__tag" style={{ color: "#fff", opacity: 0.85 }}>{tipo}</span>
          <h3>{p.nome}</h3>
          <div className="slide__price">
            <span>{reais(d.preco_promocional_centavos ?? p.preco_centavos)}</span>
            {d.preco_promocional_centavos != null ? <s>{reais(p.preco_centavos)}</s> : null}
          </div>
        </div>
      </a>
    );
  };

  const card = (p: Produto) => (
    <a key={p.id} href={`#p${p.id}`} className={`card${p.disponivel ? "" : " off"}`}>
      <div className="card__media">
        {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span className="ph">{iniciais(p.nome)}</span>}
      </div>
      <div className="card__body">
        <h3 className="card__title">{p.nome}</h3>
        {p.descricao ? <p className="card__desc">{p.descricao}</p> : null}
        <div className="card__foot">
          <span className="price">{reais(p.preco_centavos)}</span>
          {p.disponivel ? <span className="more">Ver detalhes</span> : <span className="badge-off">Indisponível</span>}
        </div>
      </div>
    </a>
  );

  const popup = (p: Produto, indice: number) => (
    <div key={`m${p.id}`} id={`p${p.id}`} className="modal" role="dialog" aria-modal="true" aria-label={p.nome} style={{ ["--c" as string]: corDaSecao(indice) }}>
      <a href="#" className="modal__bg" aria-label="Fechar" />
      <div className="modal__box">
        <a href="#" className="modal__x" aria-label="Fechar">×</a>
        <div className="modal__img">
          {p.foto_url ? <img src={p.foto_url} alt={p.nome} /> : <span className="ph">{iniciais(p.nome)}</span>}
        </div>
        <div className="modal__body">
          <h3 className="modal__title">{p.nome}</h3>
          {p.descricao ? <p>{p.descricao}</p> : <p>Sem descrição.</p>}
          {p.tags.length ? (
            <div className="tags">
              {p.tags.map((t) => (
                <span key={t}>{ROTULOS_TAGS[t as keyof typeof ROTULOS_TAGS] ?? t}</span>
              ))}
            </div>
          ) : null}
          <div className="modal__foot">
            <span className="price">{reais(p.preco_centavos)}</span>
            {p.disponivel ? null : <span className="badge-off">Indisponível no momento</span>}
          </div>
        </div>
      </div>
    </div>
  );

  const idxCategoria = (id: string) => categoriasComItens.findIndex((c) => c.id === id);

  return (
    <div className="cd" style={{ ["--accent" as string]: corDestaque, ["--preco" as string]: corDestaque }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="hero">
        <div className="hero__in">
          {conta.tagline ? <p className="hero__eyebrow">{conta.tagline}</p> : null}
          <h1 className="hero__title">{nome}</h1>
          {categoriasComItens.length ? (
            <ul className="hero__meta">
              <li>{categoriasComItens.length} categorias</li>
              <li>{produtos.filter((p) => categoriasComItens.some((c) => c.id === p.categoria_id)).length} itens</li>
            </ul>
          ) : null}
        </div>
      </header>

      {promos.length > 0 ? (
        <section className="highlights" aria-label="Promoção do dia">
          <div className="cx cx--promo">
            <div className="cx__head">
              <div>
                <span className="cx__tag">Promoção do dia</span>
                <h2>Hoje tem desconto</h2>
              </div>
              <span className="cx__count">{promos.length} {promos.length === 1 ? "item" : "itens"}</span>
            </div>
            <div className="cx__track">{promos.map((d) => slide(d, "Promoção"))}</div>
          </div>
        </section>
      ) : null}

      {escolhidos.length > 0 ? (
        <section className="highlights" aria-label="Destaques">
          <div className="cx cx--featured">
            <div className="cx__head">
              <div>
                <span className="cx__tag">Destaque</span>
                <h2>Escolhidos pela casa</h2>
              </div>
              <span className="cx__count">{escolhidos.length} {escolhidos.length === 1 ? "item" : "itens"}</span>
            </div>
            <div className="cx__track">{escolhidos.map((d) => slide(d, "Destaque"))}</div>
          </div>
        </section>
      ) : null}

      <nav className="bar" aria-label="Categorias">
        <div className="bar__in">
          <div className="pills">
            {categoriasComItens.map((c, i) => (
              <a key={c.id} href={`#cat-${c.id}`} className="chipnav" style={{ ["--c" as string]: corDaSecao(i) }}>
                {c.nome} <b>{porCategoria(c.id).length}</b>
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {categoriasComItens.map((c, i) => {
          const itens = porCategoria(c.id);
          const classeLista = c.layout === "grade" ? "gridc" : c.layout === "duas_colunas" ? "grid2" : "grid";
          return (
            <section key={c.id} id={`cat-${c.id}`} className="section" style={{ ["--c" as string]: corDaSecao(i) }}>
              <div className="section__head">
                <div>
                  <h2>{c.nome}</h2>
                  {c.descricao ? <p>{c.descricao}</p> : null}
                </div>
                <span className="section__count">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
              </div>
              <div className={classeLista}>{itens.map((p) => card(p))}</div>
            </section>
          );
        })}
      </main>

      {produtos
        .filter((p) => categoriasComItens.some((c) => c.id === p.categoria_id))
        .map((p) => popup(p, idxCategoria(p.categoria_id)))}

      <footer className="foot">{nome}</footer>
    </div>
  );
}
