// Visual do cardápio público. Copiado do protótipo aprovado (artefato), escopado em `.cdv`
// para não afetar o restante do site. Só contém as regras da vitrine pública.
export const CSS_VITRINE = `
.cdv{
  --accent:#e4572e;--accent-ink:#ffffff;--bg:#f5f3f1;--surface:#ffffff;--surface-2:#faf9f8;
  --text:#1c1917;--muted:#6b635e;--border:#e6dfdb;--chip:#ffffff;
  --danger:#dc2626;--ok:#15803d;--warn:#b45309;--warn-bg:#fef3c7;--ok-bg:#dcfce7;
  --shadow:0 1px 2px rgb(0 0 0 / .04),0 6px 20px rgb(0 0 0 / .05);--radius:18px;
  color-scheme:light;
  box-sizing:border-box;min-height:100vh;margin:0;
  background:var(--bg);color:var(--text);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased;
}
.cdv *,.cdv *::before,.cdv *::after{box-sizing:border-box}
.cdv img{display:block;max-width:100%}
.cdv h1,.cdv h2,.cdv h3,.cdv p{margin:0}
.cdv button,.cdv input{font:inherit;color:inherit}
.cdv [hidden]{display:none!important}
.cdv :focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 70%,transparent);outline-offset:2px}
.cdv .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.cdv .progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:40;pointer-events:none}
.cdv .progress span{display:block;height:100%;background:var(--accent);transform-origin:left;transform:scaleX(0);transition:transform .15s linear}

/* cabeçalho */
.cdv .hero{color:#fff;padding:36px 0 26px;background:radial-gradient(900px 300px at 85% -20%,rgb(255 255 255 / .22),transparent 60%),linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#000))}
.cdv .hero__inner{max-width:1120px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cdv .hero__eyebrow{opacity:.9;font-size:.92rem;margin-bottom:4px}
.cdv .hero__title{font-size:clamp(1.9rem,5vw,2.8rem);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.cdv .hero__meta{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.cdv .hero__meta li,.cdv .hero__meta a{color:inherit;text-decoration:none;background:rgb(255 255 255 / .18);padding:5px 11px;border-radius:999px;font-size:.86rem;backdrop-filter:blur(6px)}

/* carrosséis de promoção e destaque */
.cdv .highlights{padding:22px 0 0}
.cdv .cx{padding-bottom:6px}
.cdv .cx+.cx{margin-top:10px}
.cdv .cx__head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 max(16px,env(safe-area-inset-left,0px)) 12px;max-width:1120px;margin:0 auto}
.cdv .cx__tag{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.cdv .cx--promo .cx__tag{color:#fff;background:var(--accent);padding:3px 9px;border-radius:999px}
.cdv .cx__head h2{font-size:1.3rem;font-weight:800;letter-spacing:-.02em;margin-top:6px}
.cdv .cx__count{font-size:.85rem;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.cdv .cx__count b{color:var(--text)}
.cdv .cx__track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:4px max(16px,env(safe-area-inset-left,0px)) 6px;scroll-padding:0 16px;scrollbar-width:none;-webkit-overflow-scrolling:touch;position:relative}
.cdv .cx__track::-webkit-scrollbar{display:none}
.cdv .slide{position:relative;flex:0 0 min(74vw,280px);height:218px;scroll-snap-align:start;border-radius:24px;overflow:hidden;color:#fff;cursor:pointer;isolation:isolate;background:var(--accent);box-shadow:0 8px 20px rgb(0 0 0 / .12);transition:transform .25s ease}
.cdv .slide:active{transform:scale(.985)}
.cdv .slide:focus-visible{outline-offset:3px}
.cdv .cx--featured .slide{background:color-mix(in srgb,var(--text) 80%,var(--accent))}
.cdv .slide__media,.cdv .slide__media img{position:absolute;inset:0;width:100%;height:100%}
.cdv .slide__media img{object-fit:cover}
.cdv .slide__initials{position:absolute;inset:0;display:grid;place-items:center;font-size:4rem;font-weight:800;color:rgb(255 255 255 / .35)}
.cdv .slide__shade{position:absolute;inset:0;background:linear-gradient(to top,rgb(0 0 0 / .78) 12%,rgb(0 0 0 / .08) 58%,rgb(0 0 0 / .18));z-index:-1}
.cdv .slide__top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:8px}
.cdv .slide__chip{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:999px;background:rgb(255 255 255 / .92);color:#1c1917;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cdv .slide__chip--time{background:rgb(0 0 0 / .45);color:#fff;backdrop-filter:blur(6px)}
.cdv .slide__body{position:absolute;left:14px;right:14px;bottom:12px;display:flex;flex-direction:column;gap:3px}
.cdv .slide__body h3{font-size:1.1rem;font-weight:700;letter-spacing:-.01em;line-height:1.2;text-wrap:balance}
.cdv .slide__body p{font-size:.8rem;opacity:.9;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.cdv .slide__price{display:flex;align-items:baseline;gap:8px;margin-top:2px}
.cdv .slide__price-now{font-size:1.05rem;font-weight:800;font-variant-numeric:tabular-nums}
.cdv .slide__price s{opacity:.75;font-size:.92rem}
.cdv .cx__dots{display:flex;justify-content:center;gap:6px;padding-top:8px}
.cdv .cx__dots button{width:8px;height:8px;border-radius:999px;border:0;padding:0;background:var(--border);cursor:pointer;transition:width .3s ease,background .3s ease}
.cdv .cx__dots button[aria-current="true"]{width:24px;background:var(--accent)}
@media (min-width:760px){.cdv .slide{flex-basis:300px;height:230px}}

/* barra de categorias: uma linha deslizável, indicador sob a aba da seção atual */
.cdv .bar{position:sticky;top:0;z-index:20;padding-top:env(safe-area-inset-top,0px);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);border-bottom:1px solid var(--border);box-shadow:0 6px 18px rgb(0 0 0 / .04)}
.cdv .bar__inner{max-width:1120px;margin:0 auto;padding:0 max(12px,env(safe-area-inset-right,0px)) 0 max(12px,env(safe-area-inset-left,0px))}
.cdv .bar__row{display:flex;align-items:center;gap:6px;min-width:0;height:50px}
.cdv .tabs{position:relative;flex:1;min-width:0;height:100%;display:flex;align-items:center;gap:2px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;-webkit-mask-image:linear-gradient(90deg,#000 86%,transparent);mask-image:linear-gradient(90deg,#000 86%,transparent)}
.cdv .tabs::-webkit-scrollbar{display:none}
.cdv .tab{flex:0 0 auto;height:100%;display:inline-flex;align-items:center;padding:0 12px;color:var(--muted);text-decoration:none;font-size:.92rem;font-weight:600;white-space:nowrap;transition:color .25s ease}
.cdv .tab:hover{color:var(--text)}
.cdv .tab.is-active{color:var(--text);font-weight:800}
.cdv .tabs__ink{position:absolute;left:0;bottom:0;height:3px;width:0;border-radius:3px 3px 0 0;background:var(--accent);transition:transform .35s cubic-bezier(.2,.8,.2,1),width .35s cubic-bezier(.2,.8,.2,1)}

/* gaveta de categorias: folha que sobe no celular, janela no computador */
.cdv .sheet{position:fixed;inset:auto 0 0 0;margin:0;width:100%;max-width:none;max-height:82dvh;padding:0 0 env(safe-area-inset-bottom,0px);border:0;border-radius:26px 26px 0 0;background:var(--bg);color:var(--text);box-shadow:0 -20px 60px rgb(0 0 0 / .22);overflow:hidden;display:none;flex-direction:column}
.cdv .sheet[open]{display:flex;animation:cdv-sheet .3s cubic-bezier(.2,.8,.2,1)}
.cdv .sheet::backdrop{background:rgb(0 0 0 / .42);backdrop-filter:blur(3px)}
@keyframes cdv-sheet{from{transform:translateY(100%)}to{transform:none}}
@media (min-width:760px){
  .cdv .sheet{inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(640px,calc(100vw - 32px));max-height:80dvh;border-radius:26px}
  .cdv .sheet[open]{animation:cdv-pop .22s ease-out}
}
.cdv .sheet__handle{width:44px;height:5px;border-radius:9px;background:var(--border);margin:10px auto 0;flex:0 0 auto}
.cdv .sheet__head{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 6px;flex:0 0 auto}
.cdv .sheet__head h2{font-size:1.3rem;font-weight:800;letter-spacing:-.02em}
.cdv .sheet__close{width:36px;height:36px;border-radius:50%;border:0;background:var(--surface);color:var(--text);font-size:1.4rem;line-height:1;cursor:pointer;box-shadow:var(--shadow)}
.cdv .sheet__grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:max-content;align-content:start;gap:10px;padding:10px 16px 28px;overflow:auto;flex:1 1 auto;min-height:0}
@media (min-width:760px){.cdv .sheet__grid{grid-template-columns:repeat(3,1fr)}}
.cdv .tile{all:unset;box-sizing:border-box;display:block;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);cursor:pointer;transition:transform .15s ease}
.cdv .tile:active{transform:scale(.98)}
.cdv .tile:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.cdv .tile__media{position:relative;display:block;height:86px;background:color-mix(in srgb,var(--c) 18%,var(--border))}
.cdv .tile__media img{width:100%;height:100%;object-fit:cover}
.cdv .tile__ini{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:1.2rem;color:var(--c)}
.cdv .tile__txt{display:block;padding:10px 12px 12px;border-top:3px solid var(--c)}
.cdv .tile__txt strong,.cdv .tile__txt small{display:block}
.cdv .tile__txt small{margin-top:2px}
.cdv .tile__txt strong{font-size:.95rem;line-height:1.2}
.cdv .tile__txt small{color:var(--muted);font-size:.78rem}
.cdv .bar__btn{flex:0 0 auto;width:36px;height:34px;border-radius:999px;border:1px solid var(--border);background:var(--chip);color:var(--text);display:grid;place-items:center;cursor:pointer}
.cdv .bar__btn svg{width:17px;height:17px}
.cdv .bar__field{flex:1;position:relative;display:flex;align-items:center;min-width:0}
.cdv .bar__field input{width:100%;height:36px;padding:0 14px 0 38px;border-radius:999px;border:1px solid var(--accent);background:var(--surface);color:var(--text);outline:none;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 16%,transparent)}
.cdv .bar__icon{position:absolute;left:13px;width:16px;height:16px;color:var(--muted);pointer-events:none}

/* seções e cards */
.cdv .menu{padding-top:4px;padding-bottom:36px;min-height:60vh}
.cdv .section{scroll-margin-top:150px;padding:26px max(16px,env(safe-area-inset-left,0px)) 0;max-width:1120px;margin:0 auto}
.cdv .section__head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:2px solid var(--c)}
.cdv .section__head h2{font-size:1.35rem;font-weight:800;letter-spacing:-.02em}
.cdv .section__head p{color:var(--muted);font-size:.9rem;margin-top:2px}
.cdv .section__count{font-size:.8rem;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.cdv .grid{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.cdv .grid--2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cdv .grid--4{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (min-width:640px){.cdv .grid--4{grid-template-columns:repeat(4,1fr);gap:12px}}
.cdv .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);transition:transform .2s ease,border-color .2s ease;min-width:0}
@media (hover:hover){.cdv .card:hover{transform:translateY(-2px)}}
.cdv .card__btn{all:unset;box-sizing:border-box;display:flex;flex-direction:row;align-items:stretch;width:100%;cursor:pointer}
.cdv .card__btn:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
.cdv .card__media{position:relative;flex:0 0 104px;width:104px;min-height:104px;margin:10px 0 10px 10px;border-radius:14px;background:color-mix(in srgb,var(--c,var(--accent)) 16%,var(--border));overflow:hidden}
.cdv .card__media img{width:100%;height:100%;object-fit:cover}
.cdv .placeholder{width:100%;height:100%;display:grid;place-items:center;font-weight:800;font-size:1.4rem;color:var(--c,var(--accent))}
.cdv .card__body{padding:12px 14px 12px 12px;display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.cdv .card__title{font-size:.98rem;font-weight:700;line-height:1.25}
.cdv .card__desc{color:var(--muted);font-size:.85rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cdv .card__foot{margin-top:auto;padding-top:6px;display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap}
.cdv .price{font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;font-size:1rem}
.cdv .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.cdv .tag{font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--accent)}
.cdv .tag--vegetariano,.cdv .tag--vegano{background:color-mix(in srgb,#16a34a 14%,transparent);color:#16a34a}
.cdv .tag--sem-gluten{background:color-mix(in srgb,#ca8a04 14%,transparent);color:#a16207}
.cdv .badge-off{position:absolute;left:6px;top:6px;font-size:.7rem;font-weight:800;padding:4px 9px;border-radius:999px;background:rgb(0 0 0 / .6);color:#fff}
.cdv .card.is-off .card__media img{filter:grayscale(1);opacity:.55}
.cdv .card.is-off .card__title,.cdv .card.is-off .price{color:var(--muted)}
/* 2 colunas: cards na vertical */
.cdv .grid--2 .card__btn{flex-direction:column}
.cdv .grid--2 .card__media{flex:none;width:100%;min-height:0;height:auto;aspect-ratio:4/3;margin:0;border-radius:0}
.cdv .grid--2 .card__body{padding:10px 12px 12px}
/* grade compacta: 2 colunas no celular, 4 no computador */
.cdv .grid--4 .card__btn{flex-direction:column}
.cdv .grid--4 .card__media{flex:none;width:100%;min-height:0;height:auto;aspect-ratio:1/1;margin:0;border-radius:0}
.cdv .grid--4 .card__body{padding:8px 10px 10px}
.cdv .grid--4 .card__title{font-size:.84rem;line-height:1.2}
.cdv .grid--4 .card__desc{display:none}
.cdv .grid--4 .price{font-size:.86rem}

.cdv .empty{text-align:center;padding:56px 16px;color:var(--muted);max-width:1120px;margin:0 auto}
.cdv .retry{margin-top:14px;padding:10px 18px;border-radius:999px;border:0;background:var(--accent);color:var(--accent-ink);font-weight:700;cursor:pointer}
.cdv .footer{text-align:center;color:var(--muted);font-size:.85rem;padding:30px 16px 40px}
.cdv .to-top{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:48px;height:48px;border-radius:50%;border:0;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink);box-shadow:0 10px 24px color-mix(in srgb,var(--accent) 40%,transparent);cursor:pointer;z-index:30}
.cdv .to-top svg{width:22px;height:22px}

/* detalhe do item (popup centralizado) */
.cdv .item-dialog{position:fixed;inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:0;padding:0;border-radius:24px;background:var(--surface);color:var(--text);box-shadow:0 30px 80px rgb(0 0 0 / .3)}
.cdv .item-dialog::backdrop{background:rgb(0 0 0 / .5);backdrop-filter:blur(3px)}
.cdv .item-dialog[open]{animation:cdv-pop .22s ease-out}
@keyframes cdv-pop{from{opacity:0;transform:translate(-50%,-46%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.cdv .item-dialog__close{position:absolute;top:12px;right:12px;width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:50%;background:rgb(0 0 0 / .45);color:#fff;cursor:pointer;z-index:2}
.cdv .item-dialog__close svg{width:18px;height:18px}
.cdv .item-dialog__media{position:relative;width:100%;aspect-ratio:16/10;background:color-mix(in srgb,var(--accent) 12%,var(--border))}
.cdv .item-dialog__media img{width:100%;height:100%;object-fit:cover}
.cdv .item-dialog__media .placeholder{font-size:2.4rem}
.cdv .item-dialog__content{padding:20px 22px 24px;display:flex;flex-direction:column;gap:10px}
.cdv .item-dialog__title{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.cdv .item-dialog__desc{color:var(--muted)}
.cdv .item-dialog__foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px;flex-wrap:wrap}
.cdv .item-dialog__price{display:flex;align-items:baseline;gap:8px}
.cdv .item-dialog__price .price{font-size:1.4rem}
.cdv .item-dialog .badge-off{position:static;background:var(--warn-bg);color:var(--warn)}
.cdv .price--promo{color:var(--accent)}
.cdv .price-old{color:var(--muted);font-size:.85rem;text-decoration:line-through;font-variant-numeric:tabular-nums}
.cdv .item-dialog__note{font-size:.85rem;color:var(--muted)}

/* abertura: cortina com anéis e nome do restaurante */
.cdv .intro{position:fixed;inset:0;z-index:200;display:grid;place-items:center;overflow:hidden;color:#fff;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#000));transition:transform .6s cubic-bezier(.7,0,.2,1),visibility 0s linear .6s}
.cdv .intro.is-out{transform:translateY(-100%);visibility:hidden}
.cdv .intro__ring{position:absolute;left:50%;top:50%;width:46vmin;height:46vmin;margin:-23vmin 0 0 -23vmin;border:2px solid rgb(255 255 255 / .55);border-radius:50%;opacity:0;animation:cdv-ring 1.8s cubic-bezier(.2,.6,.3,1) infinite}
.cdv .intro__ring:nth-child(2){animation-delay:.6s}
.cdv .intro__ring:nth-child(3){animation-delay:1.2s}
@keyframes cdv-ring{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.9);opacity:0}}
.cdv .intro__name{position:relative;font-size:clamp(2rem,9vw,3.2rem);font-weight:800;letter-spacing:-.03em;text-align:center;padding:0 24px;text-wrap:balance;max-width:90vw}
.cdv .intro__name span{display:inline-block;transform:translateY(115%);opacity:0;animation:cdv-rise .55s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(.15s + var(--i) * 32ms)}
@keyframes cdv-rise{to{transform:none;opacity:1}}
.cdv .intro__bar{position:absolute;left:50%;bottom:calc(44px + env(safe-area-inset-bottom,0px));width:120px;height:3px;margin-left:-60px;border-radius:3px;background:rgb(255 255 255 / .25);overflow:hidden}
.cdv .intro__bar i{display:block;height:100%;width:40%;background:#fff;border-radius:3px;animation:cdv-slide 1.1s ease-in-out infinite}
@keyframes cdv-slide{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}
/* conteúdo entra em cascata quando a cortina sobe */
.cdv.intro-on:not(.is-ready) .hero__inner>*,.cdv.intro-on:not(.is-ready) .highlights{opacity:0}
.cdv.is-ready .hero__inner>*{animation:cdv-up .6s cubic-bezier(.2,.8,.2,1) both}
.cdv.is-ready .hero__inner>:nth-child(2){animation-delay:.08s}
.cdv.is-ready .hero__inner>:nth-child(3){animation-delay:.16s}
.cdv.is-ready .highlights{animation:cdv-up .6s cubic-bezier(.2,.8,.2,1) .2s both}
@keyframes cdv-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* adicionais dentro do popup do item */
.cdv .item-dialog__adicionais{margin-top:18px;padding-top:16px;border-top:1px solid color-mix(in srgb,var(--border) 60%,transparent)}
.cdv .item-dialog__adicionais-titulo{margin-bottom:6px;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.cdv .ad-dropdown{border:1px solid var(--border);border-radius:16px;background:var(--surface-2);overflow:hidden}
.cdv .ad-dropdown__resumo{display:flex;align-items:center;gap:10px;padding:13px 14px;cursor:pointer;list-style:none;user-select:none;transition:background .2s ease}
.cdv .ad-dropdown__resumo::-webkit-details-marker{display:none}
.cdv .ad-dropdown__resumo:hover{background:color-mix(in srgb,var(--accent) 6%,var(--surface-2))}
.cdv .ad-dropdown__resumo:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
.cdv .ad-dropdown__titulo{font-weight:800;font-size:.95rem;color:var(--text)}
.cdv .ad-dropdown__qtd{margin-left:auto;font-size:.8rem;font-weight:700;color:var(--muted);white-space:nowrap}
.cdv .ad-dropdown__seta{display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:var(--surface);color:var(--accent);font-size:.9rem;box-shadow:var(--shadow);transition:transform .25s ease}
.cdv .ad-dropdown[open] .ad-dropdown__seta{transform:rotate(180deg)}
.cdv .ad-dropdown[open] .ad-dropdown__resumo{border-bottom:1px solid var(--border)}
.cdv .ad-dropdown .ad-tabela{width:calc(100% - 28px);margin:2px 14px 8px}
.cdv .ad-tabela{width:100%;border-collapse:collapse;font-size:.92rem}
.cdv .ad-tabela th,.cdv .ad-tabela td{padding:9px 0;border-bottom:1px solid color-mix(in srgb,var(--border) 60%,transparent);text-align:left;vertical-align:middle}
.cdv .ad-tabela td{color:var(--text)}
.cdv .ad-tabela td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted)}
.cdv .ad-tabela__grupo th{padding-top:14px;padding-bottom:4px;border-bottom:0;font-size:.82rem;font-weight:800;color:var(--text)}
.cdv .ad-tabela tr:last-child td{border-bottom:0}
.cdv .item-dialog__grupo-nome{font-weight:700;font-size:.95rem}
.cdv .item-dialog__grupo ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.cdv .item-dialog__grupo li{display:flex;justify-content:space-between;gap:12px;font-size:.9rem;color:var(--muted)}
.cdv .item-dialog__grupo li span:last-child{color:var(--text);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}

/* lista elegante: linhas com separador fino, preço alinhado à direita */
.cdv .lista-elegante{list-style:none;margin:6px 0 0;padding:0}
.cdv .lista-elegante li{border-bottom:1px solid var(--border)}
.cdv .lista-elegante li:last-child{border-bottom:0}
.cdv .le__btn{all:unset;box-sizing:border-box;display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;align-items:center;width:100%;padding:14px 4px;cursor:pointer}
.cdv .le__btn:focus-visible{outline:3px solid var(--accent);outline-offset:-3px;border-radius:12px}
.cdv .le__media{position:relative;width:56px;height:56px;border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--c,var(--accent)) 16%,var(--border))}
.cdv .le__media img{width:100%;height:100%;object-fit:cover}
.cdv .le__media .placeholder{font-size:1rem}
.cdv .le__main{min-width:0;display:flex;flex-direction:column;gap:3px}
.cdv .le__nome{font-size:1.02rem;font-weight:700;line-height:1.25;transition:color .2s ease}
.cdv .le__btn:hover .le__nome{color:var(--accent)}
.cdv .le__desc{color:var(--muted);font-size:.85rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cdv .le__preco{display:flex;flex-direction:column;align-items:flex-end;gap:4px;white-space:nowrap}
.cdv .le__preco .price{font-size:1.02rem}
.cdv .le__off{font-size:.7rem;font-weight:700;color:var(--muted)}
.cdv .lista-elegante li.is-off .le__nome,.cdv .lista-elegante li.is-off .price{color:var(--muted)}
.cdv .lista-elegante li.is-off .le__media img{filter:grayscale(1);opacity:.55}

.cdv .skeleton{display:none}
@media (prefers-reduced-motion:reduce){
  .cdv,.cdv *,.cdv *::before,.cdv *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
`;
