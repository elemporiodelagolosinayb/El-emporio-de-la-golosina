import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import asyncHandler from '../utils/asyncHandler.js';
import factory from './namedEntity.factory.js';

const admin = factory(Supplier, {
  productField: 'supplier',
  fields: ['name', 'logo', 'order', 'active'],
  imageField: 'logo',
  allowNone: true,
  label: 'El proveedor',
});

/** Público: proveedores activos con productos activos (opcional ?category=slug para combinar filtros, ?all=true para todos) */
const publicList = asyncHandler(async (req, res) => {
  const match = { active: true, supplier: { $ne: null } };
  if (req.query.category) {
    const cat = await Category.findOne({ slug: req.query.category }, '_id').lean();
    if (cat) match.category = cat._id;
  }
  const [sups, counts] = await Promise.all([
    Supplier.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $match: match }, { $group: { _id: '$supplier', count: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  const items = sups
    .map((s) => ({ _id: s._id, name: s.name, slug: s.slug, logo: s.logo?.url ? s.logo : null, productCount: map.get(String(s._id)) || 0 }))
    // ?all=true → todos los activos (cinta de marcas del home); si no, solo los que tienen productos (filtro del catálogo)
    .filter((s) => req.query.all === 'true' || s.productCount > 0);
  res.json({ ok: true, items });
});

export default { ...admin, publicList };
