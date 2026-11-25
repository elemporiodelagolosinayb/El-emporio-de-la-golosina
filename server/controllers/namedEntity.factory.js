import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { slugify, uniqueSlug, normalizeText, escapeRegex } from '../utils/text.js';
import { deleteImage } from '../services/cloudinary.service.js';

/**
 * Genera los handlers de admin para entidades "con nombre" (Category, Supplier):
 * listado con conteo de productos, alta, edición, toggle, reorden y eliminación con reasignación.
 *
 * @param {Model} Model
 * @param {object} cfg { productField: 'category'|'supplier', fields: [...], imageField?, allowNone, label }
 */
export default function namedEntityController(Model, cfg) {
  const { productField, fields, imageField, allowNone, label } = cfg;

  const pick = (body) => {
    const out = {};
    fields.forEach((f) => {
      if (body[f] !== undefined) out[f] = body[f];
    });
    return out;
  };

  async function makeSlug(name, excludeId) {
    const others = await Model.find({ slug: new RegExp(`^${escapeRegex(slugify(name))}(-\\d+)?$`), _id: { $ne: excludeId } }, 'slug').lean();
    return uniqueSlug(name, new Set(others.map((o) => o.slug)));
  }

  const list = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.q) filter.normalizedName = new RegExp(escapeRegex(normalizeText(req.query.q)));
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;

    const [items, counts] = await Promise.all([
      Model.find(filter).sort({ order: 1, name: 1 }).lean(),
      Product.aggregate([
        { $group: { _id: `$${productField}`, total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
      ]),
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c]));
    res.json({
      ok: true,
      items: items.map((i) => ({
        ...i,
        productCount: map.get(String(i._id))?.total || 0,
        activeProductCount: map.get(String(i._id))?.active || 0,
      })),
    });
  });

  const create = asyncHandler(async (req, res) => {
    const data = pick(req.body);
    data.slug = await makeSlug(data.name);
    if (data.order === undefined) {
      const last = await Model.findOne().sort({ order: -1 }).lean();
      data.order = (last?.order || 0) + 1;
    }
    const item = await Model.create(data);
    res.status(201).json({ ok: true, item });
  });

  const update = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw ApiError.notFound(`${label} no encontrado/a`);
    const data = pick(req.body);
    const oldImage = imageField ? item[imageField]?.public_id : null;

    if (data.name && data.name !== item.name) data.slug = await makeSlug(data.name, item._id);
    Object.assign(item, data);
    await item.save();

    // Si se reemplazó o quitó la imagen, borrar la anterior de Cloudinary
    if (imageField && req.body[imageField] !== undefined && oldImage && oldImage !== item[imageField]?.public_id) {
      await deleteImage(oldImage);
    }
    res.json({ ok: true, item });
  });

  const toggle = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw ApiError.notFound();
    item.active = !item.active;
    await item.save();
    res.json({ ok: true, item });
  });

  /** Recibe { ids: [...] } en el orden deseado */
  const reorder = asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) throw ApiError.badRequest('No hay nada para ordenar');
    await Model.bulkWrite(ids.map((id, idx) => ({ updateOne: { filter: { _id: id }, update: { order: idx + 1 } } })));
    res.json({ ok: true });
  });

  /**
   * DELETE /:id?reassignTo=<id|none>
   * Si tiene productos y no se indica reasignación → 409 con { inUse: true, count }
   */
  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw ApiError.notFound();
    const count = await Product.countDocuments({ [productField]: item._id });
    const { reassignTo } = req.query;

    if (count > 0) {
      if (!reassignTo) {
        throw ApiError.conflict(`${label} tiene ${count} producto(s). Reasignalos o desactivá en lugar de eliminar.`, [], { inUse: true, count });
      }
      if (reassignTo === 'none') {
        if (!allowNone) throw ApiError.badRequest('Los productos necesitan una categoría');
        await Product.updateMany({ [productField]: item._id }, { [productField]: null });
      } else {
        if (String(reassignTo) === String(item._id)) throw ApiError.badRequest('Elegí otro destino');
        const target = await Model.findById(reassignTo);
        if (!target) throw ApiError.badRequest('El destino de la reasignación no existe');
        await Product.updateMany({ [productField]: item._id }, { [productField]: target._id });
      }
    }

    await item.deleteOne();
    if (imageField && item[imageField]?.public_id) await deleteImage(item[imageField].public_id);
    res.json({ ok: true, reassigned: count });
  });

  return { list, create, update, toggle, reorder, remove };
};
