/** Normaliza texto livre pra virar um slug de URL seguro (automesa.com.br/<slug>, ver
 * src/middleware.ts): minúsculas, sem acento, só letras/números/hífen, sem hífen duplicado nem
 * nas pontas. */
export function normalizarSlug(bruto: string): string {
  return bruto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
