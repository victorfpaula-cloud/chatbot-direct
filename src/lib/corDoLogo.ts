import sharp from "sharp";
import { paraCorDeAcento } from "@/lib/paletaDoLogo";

// Extrai uma cor predominante da foto de perfil (Instagram) pra colorir o brilho de fundo da
// reserva externa de acordo com a identidade visual de cada restaurante, em vez do índigo fixo de
// sempre. Calculada no servidor (nunca no navegador do cliente) porque a foto vem de um CDN da
// Meta que não libera CORS pra leitura de pixel via <canvas> — no servidor esse problema não
// existe, é só um fetch comum.
//
// Técnica: reduzir a imagem pra 1x1 pixel faz o próprio redimensionamento (Lanczos) calcular uma
// média ponderada de todos os pixels — é a forma mais barata de estimar "a cor geral" de um logo
// sem precisar de nenhuma biblioteca de quantização de cor.
//
// Único arquivo do projeto que importa `sharp` de propósito: o binário nativo dela (~28MB) entra
// na função serverless de QUALQUER rota que importe qualquer coisa daqui, então a matemática pura
// de cor (paletaAPartirDoHex etc., usada por várias rotas de /r/[slug]) mora em paletaDoLogo.ts,
// sem essa dependência.
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
