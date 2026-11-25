import Product from '../models/Product.js';
import { withPricing, round2 } from './pricing.service.js';

/**
 * Revalida un carrito contra la base: precios (con el descuento de la promo vigente),
 * stock y estado activo. Nunca confía en precios del front: todo sale de la base.
 *
 * @param {Array<{type, id, quantity, price?}>} rawItems
 * @returns {{ items, issues, total }}
 */
async function validateCart(rawItems) {
  // Agrupar ítems repetidos
  const merged = new Map();
  for (const it of rawItems) {
    const key = `${it.type}:${it.id}`;
    const prev = merged.get(key);
    merged.set(key, { type: it.type, id: String(it.id), quantity: (prev?.quantity || 0) + Number(it.quantity), clientPrice: it.price });
  }
  const list = [...merged.values()];
  const issues = [];

  // Las promociones ya no son ítems del carrito: ahora son descuentos sobre los productos
  list
    .filter((i) => i.type !== 'product')
    .forEach((i) => issues.push({ id: i.id, type: i.type, kind: 'removed', msg: 'Las promos ahora se aplican solas como descuento en los productos' }));

  const productIds = list.filter((i) => i.type === 'product').map((i) => i.id);
  const raw = await Product.find({ _id: { $in: productIds } }).populate('supplier', 'name').lean();
  const products = await withPricing(raw, { fresh: true });
  const pMap = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  for (const it of list) {
    if (it.type !== 'product') continue;
    const p = pMap.get(it.id);
    if (!p || !p.active) {
      issues.push({ id: it.id, type: it.type, kind: 'removed', msg: `${p?.name || 'Un producto'} ya no está disponible` });
      continue;
    }
    // Sin precio cargado → "precio a confirmar"; sin stock cargado (0) → "disponibilidad a confirmar"
    // y no se controla ni descuenta stock. Con stock > 0 se respeta el límite y se descuenta.
    const priceToConfirm = !(p.finalPrice > 0);
    const stockTracked = p.stock > 0;
    let quantity = it.quantity;
    if (stockTracked && quantity > p.stock) {
      issues.push({ id: it.id, type: it.type, kind: 'quantity', msg: `${p.name}: solo quedan ${p.stock} unidades, ajustamos la cantidad` });
      quantity = p.stock;
    }
    if (it.clientPrice !== undefined && Number(it.clientPrice) !== p.finalPrice) {
      issues.push({ id: it.id, type: it.type, kind: 'price', msg: `${p.name} cambió de precio` });
    }
    items.push({
      type: 'product',
      id: it.id,
      name: p.name,
      code: p.code || '',
      slug: p.slug,
      supplier: p.supplier?.name || '',
      image: p.image?.url || '',
      listPrice: p.price,
      price: p.finalPrice,
      discountPercent: p.discountPercent,
      promotion: p.promo ? { id: String(p.promo._id), title: p.promo.title } : null,
      maxStock: stockTracked ? p.stock : null,
      stockTracked,
      priceToConfirm,
      quantity,
      subtotal: priceToConfirm ? 0 : round2(p.finalPrice * quantity),
    });
  }

  // El total suma solo lo que tiene precio; lo "a confirmar" se cotiza por WhatsApp
  const total = round2(items.reduce((acc, i) => acc + i.subtotal, 0));
  const pricePending = items.some((i) => i.priceToConfirm);
  return { items, issues, total, pricePending };
}

export { validateCart, round2 };
