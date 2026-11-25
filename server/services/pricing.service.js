import Promotion from '../models/Promotion.js';
import { activePromotionFilter } from '../utils/dates.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Promociones vigentes ahora (cache corto por instancia para no consultar en cada request) */
let cache = { at: 0, items: [] };
async function activePromotions({ fresh = false } = {}) {
  if (!fresh && Date.now() - cache.at < 15 * 1000) return cache.items;
  const items = await Promotion.find(activePromotionFilter(), 'title discountPercent occasion occasionName scope categories products endDate').lean();
  cache = { at: Date.now(), items };
  return items;
}
function invalidatePromotions() {
  cache = { at: 0, items: [] };
}

const idOf = (v) => String(v?._id || v || '');

/** ¿La promo alcanza a este producto? */
function applies(promo, product) {
  if (promo.scope === 'all') return true;
  if (promo.scope === 'categories') return promo.categories.some((c) => idOf(c) === idOf(product.category));
  if (promo.scope === 'products') return promo.products.some((p) => idOf(p) === idOf(product._id));
  return false;
}

/** Mejor promo (mayor %) que alcanza al producto */
function bestPromotion(product, promos) {
  let best = null;
  for (const p of promos) if (applies(p, product) && (!best || p.discountPercent > best.discountPercent)) best = p;
  return best;
}

/**
 * Agrega a cada producto: finalPrice, discountPercent y promo { _id, title, label, occasion }.
 * price queda como el precio de lista (se muestra tachado si hay descuento).
 */
async function withPricing(products, { fresh = false } = {}) {
  const list = Array.isArray(products) ? products : [products];
  const promos = await activePromotions({ fresh });
  const out = list.map((prod) => {
    if (!prod) return prod;
    const promo = bestPromotion(prod, promos);
    const pct = promo?.discountPercent || 0;
    return {
      ...prod,
      discountPercent: pct,
      finalPrice: pct ? round2(prod.price * (1 - pct / 100)) : prod.price,
      promo: promo
        ? { _id: promo._id, title: promo.title, label: `-${pct}%`, occasion: Promotion.occasionLabel(promo), endDate: promo.endDate }
        : null,
    };
  });
  return Array.isArray(products) ? out : out[0];
}

/** Filtro Mongo de los productos que alcanza una promo */
function productFilterForPromotion(promo) {
  if (promo.scope === 'categories') return { category: { $in: promo.categories.map(idOf) } };
  if (promo.scope === 'products') return { _id: { $in: promo.products.map(idOf) } };
  return {};
}

export { withPricing, activePromotions, invalidatePromotions, productFilterForPromotion, round2 };
