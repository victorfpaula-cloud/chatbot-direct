// Galeria de ícones das categorias do cardápio. Ícones de linha, de uma cor só (Lucide), para
// ficarem elegantes e acompanharem a cor do cardápio. Fica fora de lib/cardapio.ts porque é usada
// também no navegador (painel e cardápio público), e aquele arquivo lê o banco no servidor.
// O banco guarda só a chave (ex.: "cafe"); o desenho sai daqui.
import {
  Apple,
  Beef,
  Beer,
  Cake,
  CakeSlice,
  Candy,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  CupSoda,
  Donut,
  Drumstick,
  Egg,
  Fish,
  Flame,
  GlassWater,
  Grape,
  Hamburger,
  IceCreamCone,
  Leaf,
  Martini,
  Nut,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  ShoppingBasket,
  Soup,
  Sparkles,
  Star,
  Utensils,
  Wheat,
  Wine,
  Croissant,
  type LucideIcon,
} from "lucide-react";

export const ICONES_CATEGORIA: { chave: string; Icone: LucideIcon; rotulo: string }[] = [
  { chave: "entrada", Icone: Soup, rotulo: "Entrada" },
  { chave: "porcao", Icone: Utensils, rotulo: "Porção" },
  { chave: "risoto", Icone: CookingPot, rotulo: "Risoto" },
  { chave: "massa", Icone: Wheat, rotulo: "Massa" },
  { chave: "salada", Icone: Salad, rotulo: "Salada" },
  { chave: "sanduiche", Icone: Sandwich, rotulo: "Sanduíche" },
  { chave: "lanche", Icone: Hamburger, rotulo: "Lanche" },
  { chave: "pizza", Icone: Pizza, rotulo: "Pizza" },
  { chave: "cafe", Icone: Coffee, rotulo: "Café" },
  { chave: "pao", Icone: Croissant, rotulo: "Pão" },
  { chave: "ovo", Icone: Egg, rotulo: "Ovo" },
  { chave: "carne", Icone: Beef, rotulo: "Carne" },
  { chave: "frango", Icone: Drumstick, rotulo: "Frango" },
  { chave: "peixe", Icone: Fish, rotulo: "Peixe" },
  { chave: "sobremesa", Icone: CakeSlice, rotulo: "Sobremesa" },
  { chave: "bolo", Icone: Cake, rotulo: "Bolo" },
  { chave: "sorvete", Icone: IceCreamCone, rotulo: "Sorvete" },
  { chave: "doce", Icone: Candy, rotulo: "Doce" },
  { chave: "donut", Icone: Donut, rotulo: "Donut" },
  { chave: "biscoito", Icone: Cookie, rotulo: "Biscoito" },
  { chave: "pipoca", Icone: Popcorn, rotulo: "Pipoca" },
  { chave: "amendoim", Icone: Nut, rotulo: "Castanhas" },
  { chave: "suco", Icone: Citrus, rotulo: "Suco" },
  { chave: "refri", Icone: CupSoda, rotulo: "Refrigerante" },
  { chave: "agua", Icone: GlassWater, rotulo: "Água" },
  { chave: "fruta", Icone: Apple, rotulo: "Fruta" },
  { chave: "cereja", Icone: Cherry, rotulo: "Frutas vermelhas" },
  { chave: "uva", Icone: Grape, rotulo: "Uva" },
  { chave: "drink", Icone: Martini, rotulo: "Drink" },
  { chave: "cerveja", Icone: Beer, rotulo: "Cerveja" },
  { chave: "vinho", Icone: Wine, rotulo: "Vinho" },
  { chave: "espumante", Icone: Sparkles, rotulo: "Espumante" },
  { chave: "vegetariano", Icone: Leaf, rotulo: "Vegetariano" },
  { chave: "chef", Icone: ChefHat, rotulo: "Da casa" },
  { chave: "diversos", Icone: ShoppingBasket, rotulo: "Diversos" },
  { chave: "destaque", Icone: Star, rotulo: "Destaque" },
  { chave: "fogo", Icone: Flame, rotulo: "Mais pedido" },
];

export const iconeValido = (chave: string | null | undefined): string =>
  ICONES_CATEGORIA.some((i) => i.chave === chave) ? (chave as string) : "";

/** Desenho do ícone pela chave; null se a chave não existir ou estiver vazia. */
export function IconeCategoria({
  chave,
  className,
}: {
  chave: string | null | undefined;
  className?: string;
}) {
  const item = ICONES_CATEGORIA.find((i) => i.chave === chave);
  if (!item) return null;
  const { Icone } = item;
  return <Icone className={className} strokeWidth={1.6} aria-hidden="true" />;
}
