import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import asyncHandler from '../utils/asyncHandler.js';
import { activePromotionFilter } from '../utils/dates.js';
import factory from './namedEntity.factory.js';

const admin = factory(Category, {
  productField: 'category',
  fields: ['name', 'icon', 'order', 'active'],
  allowNone: false,
  label: 'La categoría',
});

/**
 * Público: categorías activas.
 * Por defecto solo las que tienen productos activos ("Promos" también si hay promos vigentes).
 * ?all=true → todas las activas (home y franja de categorías, como en la referencia).
 */
const publicList = asyncHandler(async (req, res) => {
  const [cats, counts, promoCount] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $match: { active: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Promotion.countDocuments(activePromotionFilter()),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  const items = cats
    .map((c) => ({
      _id: c._id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      order: c.order,
      productCount: map.get(String(c._id)) || 0,
      promoCount: c.slug === 'promos' ? promoCount : 0,
    }))
    .filter((c) => (req.query.all === 'true' && c.slug !== 'promos') || c.productCount > 0 || c.promoCount > 0);
  res.json({ ok: true, items, promoCount });
});

export default { ...admin, publicList };
