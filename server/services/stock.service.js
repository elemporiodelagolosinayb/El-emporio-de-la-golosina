import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import ApiError from '../utils/ApiError.js';

/**
 * Descuenta stock de forma atómica, ítem por ítem, con condición stock >= cantidad.
 * Si algún ítem falla, revierte los ya descontados y lanza un error claro.
 * Los productos sin stock cargado (stockTracked === false) se venden "a confirmar" y no se descuentan.
 */
async function decrementStock(items) {
  const done = [];
  for (const item of items) {
    let ok;
    if (item.type === 'product' && item.stockTracked === false) {
      ok = true;
    } else if (item.type === 'product') {
      ok = await Product.findOneAndUpdate(
        { _id: item.id, active: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, projection: { _id: 1 } }
      );
    } else if (item.maxStock === null || item.maxStock === undefined) {
      ok = true; // promo sin límite de stock
    } else {
      ok = await Promotion.findOneAndUpdate(
        { _id: item.id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, projection: { _id: 1 } }
      );
    }

    if (!ok) {
      await restoreStock(done);
      throw ApiError.conflict(`No hay stock suficiente de "${item.name}". Revisá tu carrito.`, [
        { field: 'items', msg: `Sin stock suficiente: ${item.name}` },
      ], { itemId: item.id });
    }
    if (ok !== true) done.push(item);
  }
}

/**
 * Devuelve stock (cancelaciones, rollback). Si el producto/promo ya no existe, se ignora.
 * Las promos sin límite (stock null) no se tocan gracias al filtro stock: { $ne: null }.
 */
async function restoreStock(items) {
  const productOps = [];
  const promoOps = [];
  for (const item of items) {
    if (item.type === 'product' && item.stockTracked === false) continue; // nunca se descontó
    const id = item.id || item.refId;
    const op = { updateOne: { filter: { _id: id }, update: { $inc: { stock: item.quantity } } } };
    if (item.type === 'product') productOps.push(op);
    else {
      op.updateOne.filter.stock = { $ne: null };
      promoOps.push(op);
    }
  }
  if (productOps.length) await Product.bulkWrite(productOps, { ordered: false });
  if (promoOps.length) await Promotion.bulkWrite(promoOps, { ordered: false });
}

export { decrementStock, restoreStock };
