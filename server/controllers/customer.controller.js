import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { escapeRegex } from '../utils/text.js';
import { generatePin } from '../utils/pin.js';

/** Listado con cantidad de pedidos y fecha del último */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20);
  const match = {};
  if (req.query.q) {
    const q = String(req.query.q).trim();
    const digits = q.replace(/\D/g, '');
    match.$or = [{ name: new RegExp(escapeRegex(q), 'i') }, ...(digits.length >= 3 ? [{ phone: new RegExp(escapeRegex(digits)) }] : [])];
  }
  const [items, total] = await Promise.all([
    Customer.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'orders',
          let: { cid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$customer', '$$cid'] } } },
            { $group: { _id: null, count: { $sum: 1 }, last: { $max: '$createdAt' }, spent: { $sum: { $cond: [{ $ne: ['$status', 'cancelado'] }, '$total', 0] } } } },
          ],
          as: 'stats',
        },
      },
      { $project: { pinHash: 0 } },
    ]),
    Customer.countDocuments(match),
  ]);
  res.json({
    ok: true,
    ...paginated(
      items.map((c) => ({
        ...c,
        ordersCount: c.stats[0]?.count || 0,
        lastOrder: c.stats[0]?.last || null,
        spent: c.stats[0]?.spent || 0,
        locked: c.lockUntil && new Date(c.lockUntil) > new Date(),
        stats: undefined,
      })),
      total,
      page,
      limit
    ),
  });
});

export const update = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const clash = await Customer.findOne({ phone, _id: { $ne: req.params.id } });
  if (clash) throw ApiError.conflict('Ese celular ya pertenece a otro cliente', [{ field: 'phone', msg: 'Celular en uso' }]);
  const item = await Customer.findByIdAndUpdate(req.params.id, { name: name.replace(/\s+/g, ' ').trim(), phone }, { new: true });
  if (!item) throw ApiError.notFound('Cliente no encontrado');
  res.json({ ok: true, item });
});

/** Genera un PIN nuevo, lo guarda hasheado y lo devuelve UNA vez para pasárselo por WhatsApp */
export const resetPin = asyncHandler(async (req, res) => {
  const pin = generatePin();
  const item = await Customer.findByIdAndUpdate(
    req.params.id,
    { pinHash: await bcrypt.hash(pin, 10), failedAttempts: 0, lockUntil: null },
    { new: true }
  );
  if (!item) throw ApiError.notFound('Cliente no encontrado');
  res.json({ ok: true, pin, customer: { _id: item._id, name: item.name, phone: item.phone } });
});

/** Elimina el cliente: sus pedidos se conservan con el snapshot (nombre y celular) */
export const remove = asyncHandler(async (req, res) => {
  const item = await Customer.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('Cliente no encontrado');
  await Order.updateMany({ customer: item._id }, { customer: null });
  res.json({ ok: true });
});
