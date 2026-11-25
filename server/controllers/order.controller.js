import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Counter from '../models/Counter.js';
import Customer from '../models/Customer.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { escapeRegex } from '../utils/text.js';
import { normalizePhone } from '../utils/phone.js';
import { startOfDayAR, endOfDayAR } from '../utils/dates.js';
import { validateCart as checkCartItems } from '../services/cart.service.js';
import { decrementStock, restoreStock } from '../services/stock.service.js';
import { getSettings } from '../services/settings.service.js';

// ======================= CARRITO =======================

/** POST /api/cart/validate — revalida precios, stock y vigencia */
export const validateCart = asyncHandler(async (req, res) => {
  const result = await checkCartItems(req.body.items);
  res.json({ ok: true, ...result });
});

// ======================= CLIENTE =======================

/** POST /api/orders — crea el pedido (el back recalcula todo desde la base) */
export const create = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const { items, issues, total, pricePending } = await checkCartItems(req.body.items);

  // Si algo cambió respecto de lo que el cliente vio, cortamos y le avisamos
  const blocking = issues.filter((i) => i.kind !== 'price');
  if (!items.length || blocking.length) {
    throw ApiError.conflict(blocking[0]?.msg || 'Tu carrito está vacío', blocking.map((i) => ({ field: 'items', msg: i.msg })), { issues });
  }
  const priceChanges = issues.filter((i) => i.kind === 'price');
  if (priceChanges.length) {
    throw ApiError.conflict('Algunos precios cambiaron. Revisá el carrito antes de confirmar.', priceChanges.map((i) => ({ field: 'items', msg: i.msg })), { issues });
  }
  // El mínimo se controla solo si todos los precios están cargados (si no, se confirma por WhatsApp)
  if (!pricePending && settings.minOrderAmount > 0 && total < settings.minOrderAmount) {
    throw ApiError.badRequest(`El pedido mínimo es de $${settings.minOrderAmount.toLocaleString('es-AR')}`);
  }

  // 1) Descuento atómico de stock (revierte si algo falla)
  await decrementStock(items);

  let order;
  try {
    // 2) Número correlativo legible
    const seq = await Counter.next('order');
    const orderNumber = `EMP-${String(seq).padStart(6, '0')}`;

    // 3) Snapshot de cada ítem
    order = await Order.create({
      orderNumber,
      customer: req.customer._id,
      // Datos que el cliente confirmó en el checkout (nombre completo y celular de contacto)
      customerSnapshot: { name: req.body.name, phone: req.body.phone },
      items: items.map((i) => ({
        type: i.type,
        refId: i.id,
        name: i.name,
        code: i.code,
        supplier: i.supplier || '',
        unitPrice: i.price,
        listPrice: i.listPrice,
        discountPercent: i.discountPercent || 0,
        promotionTitle: i.promotion?.title || '',
        quantity: i.quantity,
        subtotal: i.subtotal,
        priceToConfirm: Boolean(i.priceToConfirm),
        stockTracked: i.stockTracked !== false,
      })),
      total,
      pricePending: Boolean(pricePending),
      notes: req.body.notes || '',
      status: 'pendiente_pago',
      statusHistory: [{ status: 'pendiente_pago', date: new Date() }],
    });
  } catch (err) {
    await restoreStock(items);
    throw err;
  }

  // El nombre completo que confirmó queda también en su cuenta (registro del cliente)
  if (req.body.name !== req.customer.name) await Customer.updateOne({ _id: req.customer._id }, { $set: { name: req.body.name } });

  // 4) Mail al negocio: se espera antes de responder (en serverless la función puede cortarse)

  res.status(201).json({ ok: true, order: publicOrder(order) });
});

const publicOrder = (o) => ({
  _id: o._id,
  orderNumber: o.orderNumber,
  customerSnapshot: o.customerSnapshot,
  items: o.items,
  total: o.total,
  pricePending: Boolean(o.pricePending),
  notes: o.notes,
  status: o.status,
  autoConfirmed: Boolean(o.autoConfirmed),
  statusHistory: o.statusHistory,
  createdAt: o.createdAt,
});

export const mine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10, 50);
  const filter = { customer: req.customer._id };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ ok: true, ...paginated(items.map(publicOrder), total, page, limit) });
});

export const mineOne = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber, customer: req.customer._id }).lean();
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  res.json({ ok: true, order: publicOrder(order) });
});

// ======================= ADMIN =======================

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customer && mongoose.isValidObjectId(req.query.customer)) filter.customer = req.query.customer;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = startOfDayAR(req.query.from);
    if (req.query.to) filter.createdAt.$lte = endOfDayAR(req.query.to);
  }
  if (req.query.q) {
    const q = String(req.query.q).trim();
    const phone = normalizePhone(q);
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { orderNumber: rx },
      { 'customerSnapshot.name': rx },
      { 'customerSnapshot.phone': new RegExp(escapeRegex(phone || q.replace(/\D/g, '') || q)) },
    ];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ ok: true, ...paginated(items, total, page, limit) });
});

export const adminOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  res.json({ ok: true, order });
});

/** Devuelve el stock de un pedido UNA sola vez (flag stockRestored atómico) */
async function restoreOrderStockOnce(orderId) {
  const locked = await Order.findOneAndUpdate({ _id: orderId, stockRestored: false }, { $set: { stockRestored: true } }, { new: true });
  if (!locked) return false;
  await restoreStock(locked.items.map((i) => ({ type: i.type, id: i.refId, quantity: i.quantity, stockTracked: i.stockTracked })));
  return true;
}

/**
 * POST /api/orders/mine/:orderNumber/receipt-sent
 * El cliente tocó "Enviar comprobante por WhatsApp": el pago se confirma automáticamente
 * (si el pedido tiene todos los precios). Queda marcado como "confirmado automáticamente" para verificarlo.
 */
export const receiptSent = asyncHandler(async (req, res) => {
  const filter = { orderNumber: req.params.orderNumber, customer: req.customer._id };
  const updated = await Order.findOneAndUpdate(
    { ...filter, status: 'pendiente_pago', pricePending: { $ne: true } },
    {
      $set: { status: 'pago_confirmado', autoConfirmed: true },
      $push: { statusHistory: { status: 'pago_confirmado', date: new Date(), note: 'Automático: el cliente envió el comprobante por WhatsApp' } },
    },
    { new: true }
  );
  const order = updated || (await Order.findOne(filter));
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  res.json({ ok: true, order: publicOrder(order), confirmed: Boolean(updated) });
});

/** PATCH /admin/orders/:id/verify — el negocio ya vio la plata en el banco */
export const verifyPayment = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { $set: { autoConfirmed: false } }, { new: true });
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  res.json({ ok: true, order });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  const { status } = req.body;
  if (order.status === 'cancelado') throw ApiError.badRequest('El pedido está cancelado y no se puede cambiar de estado');
  if (order.status === status) return res.json({ ok: true, order });

  if (status === 'cancelado') await restoreOrderStockOnce(order._id);

  const updated = await Order.findByIdAndUpdate(
    order._id,
    // Si el negocio cambia el estado a mano, deja de figurar como "confirmado automáticamente"
    { $set: { status, autoConfirmed: false }, $push: { statusHistory: { status, date: new Date() } } },
    { new: true }
  );
  res.json({ ok: true, order: updated });
});

export const updateNotes = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { internalNotes: req.body.internalNotes || '' }, { new: true });
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  res.json({ ok: true, order });
});

/** DELETE /:id?restoreStock=true */
export const remove = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  let restored = false;
  if (req.query.restoreStock === 'true' && order.status !== 'cancelado') restored = await restoreOrderStockOnce(order._id);
  await Order.deleteOne({ _id: order._id });
  res.json({ ok: true, restored });
});

