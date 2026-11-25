/**
 * Colores de cada categoría (se alternan con la paleta de la marca).
 * Se usan en las baldosas del home y en el catálogo, así cada categoría
 * tiene SIEMPRE el mismo color en toda la tienda.
 */
export const CATEGORY_COLORS = [
  { bg: 'bg-bubblegum', soft: 'bg-bubblegum/15', text: 'text-white', ring: 'ring-bubblegum', chip: 'bg-white/25 text-white', from: 'from-bubblegum', to: 'to-bubblegum-light' },
  { bg: 'bg-sky', soft: 'bg-sky/15', text: 'text-white', ring: 'ring-sky', chip: 'bg-white/25 text-white', from: 'from-sky', to: 'to-petrol' },
  { bg: 'bg-candy-gold', soft: 'bg-candy-gold/25', text: 'text-ink', ring: 'ring-candy-gold', chip: 'bg-white/50 text-ink', from: 'from-candy-gold', to: 'to-bubblegum-light' },
  { bg: 'bg-mint', soft: 'bg-mint/30', text: 'text-petrol-dark', ring: 'ring-mint', chip: 'bg-white/50 text-petrol-dark', from: 'from-mint', to: 'to-sky' },
  { bg: 'bg-petrol', soft: 'bg-petrol/15', text: 'text-white', ring: 'ring-petrol', chip: 'bg-white/20 text-white', from: 'from-petrol', to: 'to-sky' },
];

/** Categorías que se muestran al público (Promos solo si tiene productos) */
export const visibleCategories = (categories = []) => categories.filter((c) => c.slug !== 'promos' || c.productCount > 0);

/** Link de "Promos" en los filtros: dentro del catálogo si existe la categoría, si no a /promociones */
export const promosLink = (categories = []) => (categories.some((c) => c.slug === 'promos') ? '/catalogo/promos' : '/promociones');

/** Color de una categoría según su posición en la lista visible */
export function colorOf(categories, slug) {
  const i = visibleCategories(categories).findIndex((c) => c.slug === slug);
  return CATEGORY_COLORS[(i < 0 ? 0 : i) % CATEGORY_COLORS.length];
}
