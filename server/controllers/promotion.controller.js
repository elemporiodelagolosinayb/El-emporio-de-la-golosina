import Promotion from '../models/Promotion.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { activePromotionFilter, promotionStatus, parseARDateTime, toLocalInputAR } from '../utils/dates.js';
import { deleteImage } from '../services/cloudinary.service.js';
import { invalidatePromotions } from '../services/pricing.service.js';

const decorate = (p) => ({
  ...p,
  status: promotionStatus(p),
  occasionLabel: Promotion.occasionLabel(p),
  label: `-${p.discountPercent}%`,
  startLocal: toLocalInputAR(p.startDate),
  endLocal: toLocalInputAR(p.endDate),
});

// ======================= PÚBLICO =======================

/** Promos vigentes (para home, /promociones y el cartel). ?popup=true → solo las que van en el cartel */
export const publicList = asyncHandler(async (req, res) => {
  const filter = activePromotionFilter();
  if (req.query.popup === 'true') filter.showInPopup = true;
  const items = await Promotion.find(filter)
    .populate('categories', 'name slug')
    .populate('products', 'name slug')
    .sort({ endDate: 1 })
    .lean();
  res.json({ ok: true, items: items.map(decorate) });
});

export const publicOne = asyncHandler(async (req, res) => {
  const item = await Promotion.findOne({ _id: req.params.id, ...activePromotionFilter() })
    .populate('categories', 'name slug')
    .populate('products', 'name slug')
    .lean();
  if (!item) throw ApiError.notFound('La promoción no está vigente');
  res.json({ ok: true, item: decorate(item) });
});

// ======================= ADMIN =======================

/** Listado completo (la paginación y el filtro "fechas especiales / comunes" se hacen en el front) */
export const adminList = asyncHandler(async (req, res) => {
  const items = await Promotion.find().populate('categories', 'name').populate('products', 'name').sort({ startDate: -1 }).lean();
  res.json({ ok: true, items: items.map(decorate) });
});

export const getOne = asyncHandler(async (req, res) => {
  const item = await Promotion.findById(req.params.id).lean();
  if (!item) throw ApiError.notFound('Promoción no encontrada');
  res.json({ ok: true, item: decorate(item) });
});

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

const pickPromo = (b) => ({
  title: b.title.trim(),
  description: b.description || '',
  discountPercent: Number(b.discountPercent),
  occasion: b.occasion || 'general',
  occasionName: b.occasion === 'otra' ? (b.occasionName || '').trim() : '',
  scope: b.scope || 'all',
  categories: b.scope === 'categories' ? b.categories || [] : [],
  products: b.scope === 'products' ? b.products || [] : [],
  startDate: parseARDateTime(b.startDate),
  endDate: parseARDateTime(b.endDate, { endOfDay: true }),
  active: b.active ?? true,
  price: num(b.price),
  regularPrice: num(b.regularPrice),
  showInPopup: b.showInPopup ?? true,
  ...(b.image !== undefined ? { image: b.image } : {}),
});

export const create = asyncHandler(async (req, res) => {
  const item = await Promotion.create(pickPromo(req.body));
  invalidatePromotions();
  res.status(201).json({ ok: true, item });
});

export const update = asyncHandler(async (req, res) => {
  const item = await Promotion.findById(req.params.id);
  if (!item) throw ApiError.notFound('Promoción no encontrada');
  const oldImage = item.image?.public_id;
  Object.assign(item, pickPromo(req.body));
  await item.save();
  invalidatePromotions();
  if (req.body.image !== undefined && oldImage && oldImage !== item.image?.public_id) {
    if (!(await Promotion.exists({ 'image.public_id': oldImage }))) await deleteImage(oldImage);
  }
  res.json({ ok: true, item });
});

export const toggle = asyncHandler(async (req, res) => {
  const item = await Promotion.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  item.active = !item.active;
  await item.save();
  invalidatePromotions();
  res.json({ ok: true, item });
});

/** Duplicar para reutilizar con otras fechas (queda pausada y comparte la foto) */
export const duplicate = asyncHandler(async (req, res) => {
  const src = await Promotion.findById(req.params.id).lean();
  if (!src) throw ApiError.notFound();
  const { _id, createdAt, updatedAt, __v, ...rest } = src;
  const item = await Promotion.create({ ...rest, title: `${src.title} (copia)`, active: false });
  res.status(201).json({ ok: true, item });
});

export const remove = asyncHandler(async (req, res) => {
  const item = await Promotion.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound();
  invalidatePromotions();
  const pid = item.image?.public_id;
  if (pid && !(await Promotion.exists({ 'image.public_id': pid }))) await deleteImage(pid);
  res.json({ ok: true });
});
