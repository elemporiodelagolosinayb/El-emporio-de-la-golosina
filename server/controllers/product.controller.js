import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { slugify, uniqueSlug, normalizeText, escapeRegex } from '../utils/text.js';
import { deleteImage, deleteImages } from '../services/cloudinary.service.js';
import Promotion from '../models/Promotion.js';
import { withPricing, productFilterForPromotion } from '../services/pricing.service.js';
import { activePromotionFilter } from '../utils/dates.js';
import { exportProductsXlsx, XLSX_MIME } from '../services/excel.service.js';

const SORTS = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  newest: { createdAt: -1 },
};

// Solo el admin puede ordenar por la marca "para revisar"
const ADMIN_SORTS = { ...SORTS, review_first: { needsReview: -1, name: 1 } };

// Lista blanca: needsReview / reviewNote / reviewedAt / reviewedBy NUNCA salen en la API pública
const PUBLIC_FIELDS = 'name slug code price stock image description category supplier featured';


/** Arma el filtro de búsqueda: nombre normalizado, código o nombre de proveedor */
async function searchFilter(q) {
  const term = normalizeText(q);
  if (!term) return null;
  const rx = new RegExp(escapeRegex(slugify(term)).replace(/-/g, '[- ]?'));
  const sups = await Supplier.find({ normalizedName: new RegExp(escapeRegex(term)) }, '_id').lean();
  return {
    $or: [
      { normalizedName: rx },
      { code: new RegExp(`^${escapeRegex(q.trim())}`, 'i') },
      ...(sups.length ? [{ supplier: { $in: sups.map((s) => s._id) } }] : []),
    ],
  };
}

// ======================= PÚBLICO =======================

export const publicList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 24, 60);
  const filter = { active: true };
  const and = [];

  if (req.query.category) {
    const cat = await Category.findOne({ slug: req.query.category, active: true }, '_id').lean();
    if (!cat) return res.json({ ok: true, ...paginated([], 0, page, limit) });
    filter.category = cat._id;
  }
  if (req.query.supplier) {
    const slugs = String(req.query.supplier).split(',').filter(Boolean);
    const sups = await Supplier.find({ slug: { $in: slugs } }, '_id').lean();
    filter.supplier = { $in: sups.map((s) => s._id) };
  }
  if (req.query.q) {
    const sf = await searchFilter(String(req.query.q));
    if (sf) and.push(sf);
  }
  if (req.query.inStock === 'true') filter.stock = { $gt: 0 };
  // ?promo=<id>: solo los productos alcanzados por esa promoción vigente
  if (req.query.promo) {
    if (!mongoose.isValidObjectId(req.query.promo)) return res.json({ ok: true, ...paginated([], 0, page, limit) });
    const promo = await Promotion.findOne({ _id: req.query.promo, ...activePromotionFilter() }).lean();
    if (!promo) return res.json({ ok: true, ...paginated([], 0, page, limit), promotion: null });
    and.push(productFilterForPromotion(promo));
  }
  if (and.length) filter.$and = and;

  const sort = SORTS[req.query.sort] || SORTS.name_asc;
  const [items, total] = await Promise.all([
    Product.find(filter, PUBLIC_FIELDS)
      .populate('category', 'name slug')
      .populate('supplier', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ ok: true, ...paginated(await withPricing(items), total, page, limit) });
});

export const featured = asyncHandler(async (req, res) => {
  // Destacados marcados en el admin (stock 0 = disponibilidad a confirmar, también se muestran); primero los que tienen precio
  let items = await Product.find({ active: true, featured: true }, PUBLIC_FIELDS)
    .populate('category', 'name slug')
    .populate('supplier', 'name slug')
    .sort({ price: -1, name: 1 })
    .limit(12)
    .lean();
  // Si no hay destacados marcados, mostramos productos con foto: primero los que tienen stock
  // y precio; si todavía no hay (catálogo recién cargado), igual se muestran los que tienen foto
  if (!items.length) {
    const withPhoto = { active: true, 'image.url': { $exists: true } };
    items = await Product.find({ ...withPhoto, stock: { $gt: 0 }, price: { $gt: 0 } }, PUBLIC_FIELDS)
      .populate('category', 'name slug')
      .populate('supplier', 'name slug')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    if (!items.length) {
      items = await Product.find(withPhoto, PUBLIC_FIELDS)
        .populate('category', 'name slug')
        .populate('supplier', 'name slug')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();
    }
  }
  res.json({ ok: true, items: await withPricing(items) });
});

export const bySlug = asyncHandler(async (req, res) => {
  const item = await Product.findOne({ slug: req.params.slug, active: true }, PUBLIC_FIELDS)
    .populate('category', 'name slug')
    .populate('supplier', 'name slug')
    .lean();
  if (!item) throw ApiError.notFound('Producto no encontrado');
  res.json({ ok: true, item: await withPricing(item) });
});

// ======================= ADMIN =======================

export const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 25, 200);
  const filter = {};
  if (req.query.category && mongoose.isValidObjectId(req.query.category)) filter.category = req.query.category;
  if (req.query.supplier === 'none') filter.supplier = null;
  else if (req.query.supplier && mongoose.isValidObjectId(req.query.supplier)) filter.supplier = req.query.supplier;
  if (req.query.active === 'true') filter.active = true;
  if (req.query.active === 'false') filter.active = false;
  if (req.query.noImage === 'true') filter.$or = [{ image: null }, { 'image.url': { $exists: false } }];
  if (req.query.stock === 'out') filter.stock = 0;
  if (req.query.stock === 'low') filter.stock = { $gt: 0, $lte: Number(req.query.threshold) || 5 };
  if (req.query.q) {
    const sf = await searchFilter(String(req.query.q));
    if (sf) filter.$and = [sf];
  }
  // "Para revisar (N)": N respeta los demás filtros (categoría, proveedor, búsqueda…)
  const reviewFilter = { ...filter, needsReview: true };
  if (req.query.needsReview === 'true') filter.needsReview = true;

  const sort = ADMIN_SORTS[req.query.sort] || SORTS.name_asc;
  const [items, total, reviewCount] = await Promise.all([
    Product.find(filter).populate('category', 'name').populate('supplier', 'name').sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
    Product.countDocuments(reviewFilter),
  ]);
  res.json({ ok: true, ...paginated(items, total, page, limit), reviewCount });
});

export const getOne = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id).lean();
  if (!item) throw ApiError.notFound('Producto no encontrado');
  res.json({ ok: true, item });
});

const pickProduct = (b) => ({
  name: b.name.replace(/\s+/g, ' ').trim(),
  code: b.code ? String(b.code).trim() : undefined,
  category: b.category,
  supplier: b.supplier || null,
  price: b.price,
  stock: b.stock,
  description: b.description || '',
  active: b.active ?? true,
  featured: b.featured ?? false,
  ...(b.image !== undefined ? { image: b.image } : {}),
});

async function slugFor(name, excludeId) {
  const base = slugify(name);
  const others = await Product.find({ slug: new RegExp(`^${escapeRegex(base)}(-\\d+)?$`), _id: { $ne: excludeId } }, 'slug').lean();
  return uniqueSlug(name, new Set(others.map((o) => o.slug)));
}

export const create = asyncHandler(async (req, res) => {
  const data = pickProduct(req.body);
  data.normalizedName = slugify(data.name);
  data.slug = await slugFor(data.name);
  const item = await Product.create(data);
  res.status(201).json({ ok: true, item });
});

export const update = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw ApiError.notFound('Producto no encontrado');
  // pickProduct no toca needsReview/reviewNote: editar NO borra la marca de revisión
  const data = pickProduct(req.body);
  const oldImage = item.image?.public_id;

  if (data.name !== item.name) {
    data.normalizedName = slugify(data.name);
    data.slug = await slugFor(data.name, item._id);
  }
  if (!data.code) {
    item.code = undefined; // quitar código (índice sparse)
    delete data.code;
  }
  Object.assign(item, data);
  await item.save();

  if (req.body.image !== undefined && oldImage && oldImage !== item.image?.public_id) await deleteImage(oldImage);
  res.json({ ok: true, item });
});

/** Edición rápida inline desde la tabla: precio / stock / activo / destacado */
export const quickUpdate = asyncHandler(async (req, res) => {
  const set = {};
  ['price', 'stock', 'active', 'featured'].forEach((f) => {
    if (req.body[f] !== undefined) set[f] = req.body[f];
  });
  const item = await Product.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true })
    .populate('category', 'name')
    .populate('supplier', 'name');
  if (!item) throw ApiError.notFound('Producto no encontrado');
  res.json({ ok: true, item });
});

export const remove = asyncHandler(async (req, res) => {
  // Los pedidos guardan snapshot, así que se puede eliminar sin romper nada
  const item = await Product.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('Producto no encontrado');
  await deleteImage(item.image?.public_id);
  res.json({ ok: true });
});

export const removeImage = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw ApiError.notFound('Producto no encontrado');
  const old = item.image?.public_id;
  item.image = null;
  await item.save();
  await deleteImage(old);
  res.json({ ok: true, item });
});

/** Acciones masivas: delete | activate | deactivate | category | supplier */
export const bulk = asyncHandler(async (req, res) => {
  const { ids, action, value } = req.body;
  let result;
  switch (action) {
    case 'delete': {
      const prods = await Product.find({ _id: { $in: ids } }, 'image').lean();
      result = await Product.deleteMany({ _id: { $in: ids } });
      await deleteImages(prods.map((p) => p.image?.public_id));
      return res.json({ ok: true, affected: result.deletedCount });
    }
    case 'activate':
    case 'deactivate':
      result = await Product.updateMany({ _id: { $in: ids } }, { active: action === 'activate' });
      break;
    case 'category':
      if (!value || !(await Category.exists({ _id: value }))) throw ApiError.badRequest('Elegí una categoría válida');
      result = await Product.updateMany({ _id: { $in: ids } }, { category: value });
      break;
    case 'supplier':
      if (value && !(await Supplier.exists({ _id: value }))) throw ApiError.badRequest('Proveedor inválido');
      result = await Product.updateMany({ _id: { $in: ids } }, { supplier: value || null });
      break;
    default:
      throw ApiError.badRequest('Acción inválida');
  }
  res.json({ ok: true, affected: result.modifiedCount });
});

/** Listado mínimo de todos los productos (para matcheo de fotos en el front) */
export const lookup = asyncHandler(async (req, res) => {
  const items = await Product.find({}, 'name normalizedName code image').sort({ name: 1 }).lean();
  res.json({
    ok: true,
    items: items.map((p) => ({ _id: p._id, name: p.name, normalizedName: p.normalizedName, code: p.code || '', hasImage: Boolean(p.image?.url), image: p.image?.url || '' })),
  });
});

/** Exportar catálogo completo (el front arma el .xlsx con SheetJS) */
export const exportAll = asyncHandler(async (req, res) => {
  const file = await exportProductsXlsx();
  const date = new Date().toISOString().slice(0, 10);
  res.set({
    'Content-Type': XLSX_MIME,
    'Content-Disposition': `attachment; filename="productos-emporio-${date}.xlsx"`,
    'Cache-Control': 'no-store',
  });
  res.send(file);
});

/** Arma el $set de la marca de revisión (marcar o dar por revisado) */
function reviewSet({ needsReview, reviewNote }, adminId) {
  if (needsReview) {
    const set = { needsReview: true, reviewedAt: null, reviewedBy: null };
    if (reviewNote !== undefined && reviewNote !== null) set.reviewNote = reviewNote;
    return set;
  }
  return { needsReview: false, reviewNote: '', reviewedAt: new Date(), reviewedBy: adminId };
}

/** PATCH /admin/products/:id/review  body: { needsReview, reviewNote? } */
export const setReview = asyncHandler(async (req, res) => {
  const item = await Product.findByIdAndUpdate(req.params.id, { $set: reviewSet(req.body, req.admin._id) }, { new: true, runValidators: true })
    .populate('category', 'name')
    .populate('supplier', 'name');
  if (!item) throw ApiError.notFound('Producto no encontrado');
  res.json({ ok: true, item });
});

/** PATCH /admin/products/review/bulk  body: { ids: [≤500], needsReview, reviewNote? } */
export const setReviewBulk = asyncHandler(async (req, res) => {
  const result = await Product.updateMany({ _id: { $in: req.body.ids } }, { $set: reviewSet(req.body, req.admin._id) }, { runValidators: true });
  res.json({ ok: true, affected: result.modifiedCount });
});

/**
 * Guardar fotos subidas directo a Cloudinary desde el front (carga masiva).
 * body: { items: [{ productId, url, public_id }], overwrite: bool }
 */
export const setImages = asyncHandler(async (req, res) => {
  const { items = [], overwrite = true } = req.body;
  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('No hay imágenes para guardar');
  if (items.length > 500) throw ApiError.badRequest('Máximo 500 imágenes por vez');

  const valid = items.filter(
    (i) => mongoose.isValidObjectId(i.productId) && /^https:\/\/res\.cloudinary\.com\//.test(i.url) && String(i.public_id).startsWith('emporio/')
  );
  const products = await Product.find({ _id: { $in: valid.map((v) => v.productId) } }, 'image').lean();
  const pMap = new Map(products.map((p) => [String(p._id), p]));

  const ops = [];
  const toDelete = [];
  const skipped = [];
  valid.forEach((i) => {
    const p = pMap.get(String(i.productId));
    if (!p) return;
    if (p.image?.url && !overwrite) {
      skipped.push(i.public_id); // no sobrescribir: la nueva queda huérfana, la borramos
      return;
    }
    if (p.image?.public_id && p.image.public_id !== i.public_id) toDelete.push(p.image.public_id);
    ops.push({ updateOne: { filter: { _id: i.productId }, update: { image: { url: i.url, public_id: i.public_id } } } });
  });

  if (ops.length) await Product.bulkWrite(ops, { ordered: false });
  await deleteImages([...toDelete, ...skipped]);
  res.json({ ok: true, saved: ops.length, skipped: skipped.length, invalid: items.length - valid.length });
});
