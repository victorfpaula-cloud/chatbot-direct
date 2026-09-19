// Matemática pura de cor (HSL/hex), sem nenhuma dependência de imagem — de propósito separada de
// `extrairCorPredominante` (ver corDoLogo.ts), que importa `sharp`. `sharp` embute um binário
// nativo de ~28MB, e o rastreador de arquivos da Vercel inclui o binário inteiro na função
// serverless de QUALQUER rota que importe qualquer coisa do mesmo arquivo — mesmo que a rota use
// só a matemática de cor abaixo e nunca chame `extrairCorPredominante`. Antes dessa separação,
// isso inflava 4 das 5 rotas que usam paleta de cor (config/disponibilidade/reservar/página do
// slug) com ~28MB cada, à toa, multiplicado por deployment — boa parte do estouro de Functions
// Storage da conta (ver limpeza de deployments de 18/09/2026).

function rgbParaHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    default: h = ((rn - gn) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslParaHex(h: number, s: number, l: number): string {
  const paraCanal = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const cor = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(cor * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${paraCanal(0)}${paraCanal(8)}${paraCanal(4)}`;
}

// Vermelhos/rosas (matiz perto de 0°/360°) ficam com cara de pastel/rosa em luminosidade alta —
// bem diferente de azuis/verdes, que continuam lendo como a própria cor. Por isso a luminosidade
// base não é fixa: tons quentes usam uma base mais escura (e mais saturada), pra ler como vermelho
// de verdade em vez de lavado.
function luminosidadeBaseParaMatiz(h: number): number {
  const graus = h * 360;
  const distanciaDoVermelho = Math.min(graus, 360 - graus);
  return distanciaDoVermelho < 30 ? 0.5 : 0.66;
}

/** `null` quando o logo é essencialmente sem cor (preto/branco/cinza) — nesse caso o chamador deve
 * manter a paleta índigo padrão em vez de aplicar um cinza sem graça no lugar dela. Usada por
 * `extrairCorPredominante` (corDoLogo.ts). */
export function paraCorDeAcento(r: number, g: number, b: number): string | null {
  const [h, s] = rgbParaHsl(r, g, b);
  // Realça um pouco a saturação (logos costumam vir meio "lavados" depois da média de 1x1) e trava
  // luminosidade numa faixa que continua legível em cima do fundo escuro — a mesma função da cor
  // --acento padrão (#818cf8), só que com o matiz do logo.
  const saturacaoRealcada = Math.min(1, s * 1.6);
  if (saturacaoRealcada < 0.16) return null;

  return hslParaHex(h, saturacaoRealcada, luminosidadeBaseParaMatiz(h));
}

function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace("#", "");
  return [
    parseInt(limpo.slice(0, 2), 16),
    parseInt(limpo.slice(2, 4), 16),
    parseInt(limpo.slice(4, 6), 16),
  ];
}

function hslParaRgba(h: number, s: number, l: number, alpha: number): string {
  const hex = hslParaHex(h, s, l);
  const [r, g, b] = hexParaRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type PaletaDoLogo = {
  acento: string;
  acentoHi: string;
  acentoDeep: string;
  glow1: string;
  glow2: string;
  glow3: string;
};

function normalizarHue(h: number): number {
  return ((h % 1) + 1) % 1;
}

function construirPaleta(h: number, s: number, l: number, acentoExato?: string): PaletaDoLogo {
  const lHi = Math.min(0.9, l + 0.18);
  const lDeep = Math.max(0.28, l - 0.2);

  // --acento/hi/deep (botões, texto, brilho das cadeiras...) ficam sempre no matiz EXATO da marca —
  // só os 3 brilhos de fundo (puramente atmosféricos, não presos a nenhum elemento) recebem um
  // pequeno desvio de matiz cada um, pra dar uma variação sutil de cor no fundo (alguns "spots" com
  // tons vizinhos) em vez de uma mancha monocromática só, sem perder a harmonia com a cor principal.
  const hGlow2 = normalizarHue(h + 30 / 360);
  const hGlow3 = normalizarHue(h - 25 / 360);
  const sGlowSecundario = s * 0.85;

  return {
    acento: acentoExato ?? hslParaHex(h, s, l),
    acentoHi: hslParaHex(h, s, lHi),
    acentoDeep: hslParaHex(h, s, lDeep),
    glow1: hslParaRgba(h, s, l, 0.5),
    glow2: hslParaRgba(hGlow2, sGlowSecundario, l, 0.38),
    glow3: hslParaRgba(hGlow3, sGlowSecundario, l, 0.3),
  };
}

/** A partir da cor guardada em `cor_predominante_logo` (extraída automaticamente, ver
 * `extrairCorPredominante` em corDoLogo.ts), deriva o resto da paleta usada em
 * experiencia.module.css: uma versão mais clara (hover/destaque), uma mais escura (gradiente do
 * CTA) e os 3 tons do brilho de fundo, mantendo sempre o mesmo matiz do logo. */
export function paletaAPartirDoHex(hex: string): PaletaDoLogo {
  const [r, g, b] = hexParaRgb(hex);
  const [h, s] = rgbParaHsl(r, g, b);
  return construirPaleta(h, s, luminosidadeBaseParaMatiz(h));
}

/** Igual `paletaAPartirDoHex`, mas pra quando o PRÓPRIO dono da conta escolheu a cor à mão (campo
 * "Cor de destaque" em /contas/[id]/reserva) — usa a luminosidade exata que ele escolheu (sem
 * nenhum ajuste automático) e mantém o hex digitado como --acento, pra não devolver um tom
 * levemente diferente do que ele pediu por causa de arredondamento na conversão HSL -> hex. */
export function paletaAPartirDeAcentoExato(hex: string): PaletaDoLogo {
  const [r, g, b] = hexParaRgb(hex);
  const [h, s, l] = rgbParaHsl(r, g, b);
  return construirPaleta(h, s, l, hex);
}
