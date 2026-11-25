import { notFound } from "next/navigation";
import { FUSO_CARDAPIO, ROTULOS_TAGS, carregarCardapioPublico, type Produto, type Destaque } from "@/lib/cardapio";

// Cardápio público do restaurante. Rota pública (fora do login), só lê as tabelas cardapio_*.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = { robots: { index: false, follow: false } };

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diaDe = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_CARDAPIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** "Termina hoje à meia-noite" ou "Até 27/11, meia-noite", no calendário do restaurante. */
function prazoDoDestaque(ate: string) {
  const ultimo = new Date(new Date(ate).getTime() - 1);
  if (diaDe(ultimo) === diaDe(new Date())) return "Termina hoje à meia-noite";
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_CARDAPIO, day: "2-digit", month: "2-digit" }).format(ultimo);
  return `Até ${data}, meia-noite`;
}

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

const CSS = `
.cd{--ink:#1c1917;--muted:#6b635e;--bg:#f7f4f2;--card:#fff;--line:#e9e2de;min-height:100vh;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.45;-webkit-font-smoothing:antialiased}
.cd *{box-sizing:border-box}
.cd img{display:block;max-width:100%}
.cd a{color:inherit}
.cd summary{list-style:none;cursor:pointer}
.cd summary::-webkit-details-marker{display:none}
.cd-hero{color:#fff;padding:34px 18px 24px;background:radial-gradient(800px 260px at 85% -20%,rgba(255,255,255,.22),transparent 60%),linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 50%,#000))}
.cd-hero h1{margin:0;font-size:clamp(1.8rem,6vw,2.6rem);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.cd-hero p{margin:6px 0 0;opacity:.92;font-size:.95rem}
.cd-nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.cd-nav-in{max-width:720px;margin:0 auto;padding:10px 14px;position:relative}
.cd-dd-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;height:42px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);font-weight:700;font-size:.95rem}
.cd-dd-btn small{color:var(--muted);font-weight:600}
.cd-dd[open] .cd-dd-btn{border-color:var(--ink)}
.cd-dd-caret{transition:transform .2s;font-size:.8rem;color:var(--muted)}
.cd-dd[open] .cd-dd-caret{transform:rotate(180deg)}
.cd-dd-panel{position:absolute;left:14px;right:14px;top:calc(100% - 2px);max-height:70vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px;box-shadow:0 18px 40px rgba(0,0,0,.14);display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cd-dd-panel a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 12px;border-radius:12px;text-decoration:none;font-weight:600;font-size:.92rem;background:var(--bg)}
.cd-dd-panel a:active{transform:scale(.98)}
.cd-dd-panel a span{color:var(--muted);font-size:.78rem;font-weight:700}
@media (min-width:640px){.cd-dd-panel{grid-template-columns:repeat(3,1fr)}}
.cd-wrap{max-width:720px;margin:0 auto;padding:0 14px}
.cd-block{padding-top:22px}
.cd-block-head{margin-bottom:10px}
.cd-tag{font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--c)}
.cd-block h2{margin:0;font-size:1.25rem;font-weight:800;letter-spacing:-.02em}
.cd-rail{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.cd-rail::-webkit-scrollbar{display:none}
.cd-slide{position:relative;flex:0 0 min(74vw,270px);height:200px;border-radius:20px;overflow:hidden;scroll-snap-align:start;color:#fff;background:#3a2a22;isolation:isolate;text-decoration:none}
.cd-slide img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cd-slide .ini{position:absolute;inset:0;display:grid;place-items:center;font-size:3rem;font-weight:800;color:rgba(255,255,255,.3)}
.cd-slide .shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8) 10%,rgba(0,0,0,.08) 60%,rgba(0,0,0,.2));z-index:-1}
.cd-slide .top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:6px}
.cd-pill{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.92);color:#1c1917}
.cd-pill.t{background:rgba(0,0,0,.5);color:#fff}
.cd-slide .body{position:absolute;left:14px;right:14px;bottom:12px}
.cd-slide h3{margin:0;font-size:1.05rem;font-weight:700;line-height:1.2}
.cd-slide .pr{margin-top:3px;font-size:.95rem;font-weight:800}
.cd-slide .pr s{opacity:.75;font-weight:500;font-size:.8rem;margin-left:6px}
.cd-sec{scroll-margin-top:76px;padding-top:26px}
.cd-sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:2px solid var(--c)}
.cd-sec-head h2{margin:0;font-size:1.3rem;font-weight:800;letter-spacing:-.02em}
.cd-sec-head p{margin:2px 0 0;color:var(--muted);font-size:.88rem}
.cd-count{font-size:.8rem;color:var(--muted);white-space:nowrap}
/* lista: uma coluna */
.cd-list{display:flex;flex-direction:column;gap:10px;margin-top:12px}
/* 2 colunas em qualquer tela, cards de tamanho normal */
.cd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.cd-grid2 .cd-row{flex-direction:column;gap:8px;padding:10px}
.cd-grid2 .cd-photo{flex:none;width:100%;height:auto;aspect-ratio:4/3;border-radius:12px}
.cd-grid2 .cd-name{font-size:.94rem}
.cd-grid2 .cd-desc{-webkit-line-clamp:2}
/* grade compacta: 2 colunas no celular, 4 no computador e tablet */
.cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
@media (min-width:640px){.cd-grid{grid-template-columns:repeat(4,1fr);gap:12px}}
.cd-item{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04);overflow:hidden;min-width:0}
.cd-item[open]{box-shadow:0 10px 24px rgba(0,0,0,.08)}
.cd-row{display:flex;gap:12px;align-items:stretch;padding:10px}
.cd-photo{flex:0 0 92px;height:92px;border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--c) 14%,var(--line));position:relative}
.cd-photo img{width:100%;height:100%;object-fit:cover}
.cd-photo .ini{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;color:var(--c);font-size:1.15rem}
.cd-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cd-name{font-weight:700;font-size:.98rem;line-height:1.25}
.cd-desc{color:var(--muted);font-size:.84rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cd-foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:4px}
.cd-price{font-weight:800;color:var(--c);font-variant-numeric:tabular-nums}
.cd-badge{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--line);color:var(--muted)}
.cd-more{font-size:.72rem;font-weight:700;color:var(--muted)}
.cd-item.off .cd-photo img{filter:grayscale(1);opacity:.6}
.cd-item.off .cd-name{color:var(--muted)}
/* grade: cards menores, foto em cima */
.cd-grid .cd-row{flex-direction:column;gap:6px;padding:8px}
.cd-grid .cd-photo{flex:none;width:100%;height:auto;aspect-ratio:1/1;border-radius:10px}
.cd-grid .cd-name{font-size:.84rem;line-height:1.2}
.cd-grid .cd-desc{display:none}
.cd-grid .cd-price{font-size:.86rem}
.cd-grid .cd-foot{padding-top:0}
/* detalhes expandidos */
.cd-det{padding:0 12px 14px;display:flex;flex-direction:column;gap:8px}
.cd-det-img{width:100%;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--c) 14%,var(--line))}
.cd-det-img img{width:100%;height:100%;object-fit:cover}
.cd-det p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.5}
.cd-det .cd-foot{padding-top:2px}
.cd-det .cd-price{font-size:1.1rem}
.cd-tags{display:flex;gap:5px;flex-wrap:wrap}
.cd-tags span{font-size:.66rem;font-weight:700;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--c) 13%,transparent);color:var(--c)}
.cd-foot-wrap{max-width:720px;margin:0 auto;padding:30px 14px 46px;text-align:center;color:var(--muted);font-size:.85rem}
@media (min-width:720px){.cd-slide{flex-basis:300px;height:230px}}
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

  const slide = (d: Destaque, tipoRotulo: string) => {
    const p = produtoDe(d) as Produto | undefined;
    if (!p) return null;
    return (
      <details key={d.id} className="cd-slide" style={{ display: "block" }}>
        <summary style={{ display: "block", height: "100%" }}>
          {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span className="ini">{iniciais(p.nome)}</span>}
          <div className="shade" />
          <div className="top">
            <span className="cd-pill">{categoriasComItens.find((c) => c.id === p.categoria_id)?.nome ?? ""}</span>
            <span className="cd-pill t">{prazoDoDestaque(d.ate)}</span>
          </div>
          <div className="body">
            <span className="cd-tag" style={{ color: "#fff", opacity: 0.85 }}>{tipoRotulo}</span>
            <h3>{p.nome}</h3>
            <div className="pr">
              {d.preco_promocional_centavos != null ? (
                <>
                  {reais(d.preco_promocional_centavos)}
                  <s>{reais(p.preco_centavos)}</s>
                </>
              ) : (
                reais(p.preco_centavos)
              )}
            </div>
          </div>
        </summary>
      </details>
    );
  };

  const itemCard = (p: Produto, emGrade: boolean) => (
    <details key={p.id} className={`cd-item${p.disponivel ? "" : " off"}`}>
      <summary>
        <div className="cd-row">
          <div className="cd-photo">
            {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span className="ini">{iniciais(p.nome)}</span>}
          </div>
          <div className="cd-info">
            <h3 className="cd-name">{p.nome}</h3>
            {p.descricao ? <p className="cd-desc">{p.descricao}</p> : null}
            <div className="cd-foot">
              <span className="cd-price">{reais(p.preco_centavos)}</span>
              {p.disponivel ? <span className="cd-more">Ver detalhes ▾</span> : <span className="cd-badge">Indisponível</span>}
            </div>
          </div>
        </div>
      </summary>
      <div className="cd-det">
        {p.foto_url ? (
          <div className="cd-det-img"><img src={p.foto_url} alt={p.nome} loading="lazy" /></div>
        ) : null}
        {p.descricao ? <p>{p.descricao}</p> : <p>Sem descrição.</p>}
        {p.tags.length ? (
          <div className="cd-tags">
            {p.tags.map((t) => (
              <span key={t}>{ROTULOS_TAGS[t as keyof typeof ROTULOS_TAGS] ?? t}</span>
            ))}
          </div>
        ) : null}
        <div className="cd-foot">
          <span className="cd-price">{reais(p.preco_centavos)}</span>
          {p.disponivel ? null : <span className="cd-badge">Indisponível no momento</span>}
        </div>
      </div>
    </details>
  );

  return (
    <div className="cd" style={{ ["--c" as string]: corDestaque }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="cd-hero">
        <div className="cd-wrap" style={{ padding: 0 }}>
          <h1>{nome}</h1>
          {conta.tagline ? <p>{conta.tagline}</p> : null}
        </div>
      </header>

      <nav className="cd-nav" aria-label="Categorias">
        <div className="cd-nav-in">
          <details className="cd-dd" id="cd-dd">
            <summary className="cd-dd-btn">
              <span>Categorias <small>· {categoriasComItens.length}</small></span>
              <span className="cd-dd-caret">▼</span>
            </summary>
            <div className="cd-dd-panel">
              {categoriasComItens.map((c) => (
                <a key={c.id} href={`#cat-${c.id}`} className="cd-dd-link">
                  {c.nome} <span>{porCategoria(c.id).length}</span>
                </a>
              ))}
            </div>
          </details>
        </div>
      </nav>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelectorAll('#cd-dd .cd-dd-panel a').forEach(function(a){a.addEventListener('click',function(){document.getElementById('cd-dd').open=false;});});`,
        }}
      />

      <main className="cd-wrap">
        {promos.length > 0 ? (
          <section className="cd-block" aria-label="Promoção do dia">
            <div className="cd-block-head">
              <span className="cd-tag">Promoção do dia</span>
              <h2>Hoje tem desconto</h2>
            </div>
            <div className="cd-rail">{promos.map((d) => slide(d, "Promoção"))}</div>
          </section>
        ) : null}

        {escolhidos.length > 0 ? (
          <section className="cd-block" aria-label="Destaques">
            <div className="cd-block-head">
              <span className="cd-tag">Destaque</span>
              <h2>Escolhidos pela casa</h2>
            </div>
            <div className="cd-rail">{escolhidos.map((d) => slide(d, "Destaque"))}</div>
          </section>
        ) : null}

        {categoriasComItens.map((c, i) => {
          const itens = porCategoria(c.id);
          const cor = `hsl(${(i * 37) % 360} 60% 42%)`;
          const emGrade = c.layout === "grade";
          const duasColunas = c.layout === "duas_colunas";
          return (
            <section key={c.id} id={`cat-${c.id}`} className="cd-sec" style={{ ["--c" as string]: cor }}>
              <div className="cd-sec-head">
                <div>
                  <h2>{c.nome}</h2>
                  {c.descricao ? <p>{c.descricao}</p> : null}
                </div>
                <span className="cd-count">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
              </div>
              <div className={emGrade ? "cd-grid" : duasColunas ? "cd-grid2" : "cd-list"}>
                {itens.map((p) => itemCard(p, emGrade))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="cd-foot-wrap">{nome}</footer>
    </div>
  );
}
