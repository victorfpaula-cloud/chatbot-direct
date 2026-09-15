import sharp from "sharp";

// Extrai uma cor predominante da foto de perfil (Instagram) pra colorir o brilho de fundo da
// reserva externa de acordo com a identidade visual de cada restaurante, em vez do índigo fixo de
// sempre. Calculada no servidor (nunca no navegador do cliente) porque a foto vem de um CDN da
// Meta que não libera CORS pra leitura de pixel via <canvas> — no servidor esse problema não
// existe, é só um fetch comum.
//
// Técnica: reduzir a imagem pra 1x1 pixel faz o próprio redimensionamento (Lanczos) calcular uma
// média ponderada de todos os pixels — é a forma mais barata de estimar "a cor geral" de um logo
// sem precisar de nenhuma biblioteca de quantização de cor.
export async function extrairCorPredominante(urlDaFoto: string): Promise<string | null> {
  try {
    const resposta = await fetch(urlDaFoto);
    if (!resposta.ok) return null;
    const bytes = Buffer.from(await resposta.arrayBuffer());

    const { data } = await sharp(bytes)
      .resize(1, 1, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const [r, g, b] = data;
    return paraCorDeAcento(r, g, b);
  } catch (erro) {
    console.error("Falha ao extrair cor predominante do logo:", erro);
    return null;
  }
}

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

/** `null` quando o logo é essencialmente sem cor (preto/branco/cinza) — nesse caso o chamador deve
 * manter a paleta índigo padrão em vez de aplicar um cinza sem graça no lugar dela. */
function paraCorDeAcento(r: number, g: number, b: number): string | null {
  const [h, s] = rgbParaHsl(r, g, b);
  // Realça um pouco a saturação (logos costumam vir meio "lavados" depois da média de 1x1) e trava
  // luminosidade numa faixa que continua legível em cima do fundo escuro — a mesma função da cor
  // --acento padrão (#818cf8), só que com o matiz do logo.
  const saturacaoRealcada = Math.min(1, s * 1.6);
  if (saturacaoRealcada < 0.16) return null;

  return hslParaHex(h, saturacaoRealcada, 0.66);
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

/** A partir da cor guardada em `cor_predominante_logo` (já vem em H/L pensados pra virar --acento
 * direto), deriva o resto da paleta usada em experiencia.module.css: uma versão mais clara (hover/
 * destaque), uma mais escura (gradiente do CTA) e os 3 tons do brilho de fundo, mantendo sempre o
 * mesmo matiz do logo. */
export function paletaAPartirDoHex(hex: string): PaletaDoLogo {
  const [r, g, b] = hexParaRgb(hex);
  const [h, s] = rgbParaHsl(r, g, b);

  return {
    acento: hslParaHex(h, s, 0.66),
    acentoHi: hslParaHex(h, s, 0.84),
    acentoDeep: hslParaHex(h, s, 0.45),
    glow1: hslParaRgba(h, s, 0.66, 0.5),
    glow2: hslParaRgba(h, s, 0.66, 0.4),
    glow3: hslParaRgba(h, s, 0.66, 0.32),
  };
}
