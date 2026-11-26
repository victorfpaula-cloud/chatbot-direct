// Galeria de ícones das categorias do cardápio. Fica fora de lib/cardapio.ts porque é usada
// também no navegador (painel e cardápio público), e aquele arquivo lê o banco no servidor.
// O banco guarda só a chave (ex.: "burger"); o emoji sai daqui.

export const ICONES_CATEGORIA = [
  { chave: "entrada", emoji: "🥗", rotulo: "Entrada" },
  { chave: "porcao", emoji: "🍟", rotulo: "Porção" },
  { chave: "risoto", emoji: "🍚", rotulo: "Risoto" },
  { chave: "massa", emoji: "🍝", rotulo: "Massa" },
  { chave: "salada", emoji: "🥬", rotulo: "Salada" },
  { chave: "sanduiche", emoji: "🥪", rotulo: "Sanduíche" },
  { chave: "lanche", emoji: "🍔", rotulo: "Lanche" },
  { chave: "burger", emoji: "🍔", rotulo: "Hambúrguer" },
  { chave: "pizza", emoji: "🍕", rotulo: "Pizza" },
  { chave: "taco", emoji: "🌮", rotulo: "Taco" },
  { chave: "wrap", emoji: "🌯", rotulo: "Wrap" },
  { chave: "cafe", emoji: "☕", rotulo: "Café" },
  { chave: "pao", emoji: "🥖", rotulo: "Pão" },
  { chave: "ovo", emoji: "🍳", rotulo: "Ovo" },
  { chave: "croissant", emoji: "🥐", rotulo: "Croissant" },
  { chave: "panqueca", emoji: "🥞", rotulo: "Panqueca" },
  { chave: "carne", emoji: "🥩", rotulo: "Carne" },
  { chave: "frango", emoji: "🍗", rotulo: "Frango" },
  { chave: "peixe", emoji: "🐟", rotulo: "Peixe" },
  { chave: "camarao", emoji: "🍤", rotulo: "Camarão" },
  { chave: "sushi", emoji: "🍣", rotulo: "Japonês" },
  { chave: "sobremesa", emoji: "🍮", rotulo: "Sobremesa" },
  { chave: "bolo", emoji: "🍰", rotulo: "Bolo" },
  { chave: "sorvete", emoji: "🍦", rotulo: "Sorvete" },
  { chave: "doce", emoji: "🍬", rotulo: "Doce" },
  { chave: "suco", emoji: "🧃", rotulo: "Suco" },
  { chave: "refri", emoji: "🥤", rotulo: "Refrigerante" },
  { chave: "agua", emoji: "💧", rotulo: "Água" },
  { chave: "drink", emoji: "🍹", rotulo: "Drink" },
  { chave: "coquetel", emoji: "🍸", rotulo: "Coquetel" },
  { chave: "cerveja", emoji: "🍺", rotulo: "Cerveja" },
  { chave: "vinho", emoji: "🍷", rotulo: "Vinho" },
  { chave: "espumante", emoji: "🥂", rotulo: "Espumante" },
  { chave: "whisky", emoji: "🥃", rotulo: "Destilado" },
  { chave: "diversos", emoji: "🛒", rotulo: "Diversos" },
  { chave: "estrela", emoji: "⭐", rotulo: "Destaque" },
  { chave: "fogo", emoji: "🔥", rotulo: "Mais pedido" },
] as const;

export type ChaveIcone = (typeof ICONES_CATEGORIA)[number]["chave"];

export const emojiDoIcone = (chave: string | null | undefined): string =>
  ICONES_CATEGORIA.find((i) => i.chave === chave)?.emoji ?? "";

export const iconeValido = (chave: string | null | undefined): string =>
  ICONES_CATEGORIA.some((i) => i.chave === chave) ? (chave as string) : "";
