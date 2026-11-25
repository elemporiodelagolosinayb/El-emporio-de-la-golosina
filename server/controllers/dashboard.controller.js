import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import asyncHandler from '../utils/asyncHandler.js';
import { startOfDayAR, endOfDayAR, toYMD, activePromotionFilter } from '../utils/dates.js';
import { getSettings } from '../services/settings.service.js';

export const summary = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const threshold = settings.lowStockThreshold ?? 5;
  const today = toYMD(new Date());
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [todayOrders, todayAgg, pendingPayment, inPreparation, lowStock, lowCount, activePromos, upcomingPromos, noImageCount, latestOrders, reviewCount] =
    await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfDayAR(today), $lte: endOfDayAR(today) } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDayAR(today), $lte: endOfDayAR(today) }, status: { $ne: 'cancelado' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ status: 'pendiente_pago' }),
      Order.countDocuments({ status: { $in: ['pago_confirmado', 'en_preparacion'] } }),
      Product.find({ active: true, stock: { $gt: 0, $lte: threshold } }, 'name code stock').sort({ stock: 1 }).limit(15).lean(),
      Product.countDocuments({ active: true, stock: { $gt: 0, $lte: threshold } }),
      Promotion.find(activePromotionFilter(now), 'title endDate price').sort({ endDate: 1 }).lean(),
      Promotion.find({ active: true, startDate: { $gt: now } }, 'title startDate').sort({ startDate: 1 }).limit(5).lean(),
      Product.countDocuments({ $or: [{ image: null }, { 'image.url': { $exists: false } }] }),
      Order.find({}, 'orderNumber customerSnapshot total pricePending status createdAt').sort({ createdAt: -1 }).limit(8).lean(),
      Product.countDocuments({ needsReview: true }),
    ]);

  res.json({
    ok: true,
    threshold,
    orders: { today: todayOrders, todayTotal: todayAgg[0]?.total || 0, pendingPayment, inPreparation, latest: latestOrders },
    stock: { lowStock, lowCount, noImageCount, reviewCount },
    promotions: {
      active: activePromos.map((p) => ({ ...p, endingSoon: new Date(p.endDate) <= soon })),
      upcoming: upcomingPromos,
    },
  });
});
