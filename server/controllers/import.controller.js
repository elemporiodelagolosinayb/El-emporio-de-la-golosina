import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { slugify, toTitleCase, uniqueSlug, normalizeText, matchKey } from '../utils/text.js';
import * as importService from '../services/import.service.js';

function requireFile(req) {
  if (!req.file) throw ApiError.badRequest('Subí un archivo Excel', [{ field: 'file', msg: 'Archivo requerido' }]);
}

function checkOptions(options) {
  const any = ['createNew', 'updatePrice', 'updateStock', 'updateCategory', 'updateSupplier', 'updateName', 'updateReview'].some((k) => options[k]);
  if (!any) throw ApiError.badRequest('Elegí al menos una columna para actualizar');
}

/** Opciones del formulario + quién importa (para "revisado por") */
function readOptions(req) {
  const options = importService.parseOptions(req.body);
  checkOptions(options);
  return { ...options, adminId: req.admin?._id || null };
}

/** Paso 1: vista previa (dry-run). No guarda nada. */
export const preview = asyncHandler(async (req, res) => {
  requireFile(req);
  const options = readOptions(req);
  const plan = await importService.analyze(req.file.buffer, options);
  res.json({ ok: true, plan });
});

/**
 * Paso 2: confirmar. Se vuelve a subir el mismo archivo (stateless, ideal para serverless)
 * y se recalcula el plan antes de aplicar, por si algo cambió entre la vista previa y la confirmación.
 */
export const apply = asyncHandler(async (req, res) => {
  requireFile(req);
  const options = readOptions(req);
  if (options.deleteMissing && req.body.confirmDelete !== 'ELIMINAR') {
    throw ApiError.badRequest('Falta la confirmación para eliminar productos');
  }
  const plan = await importService.analyze(req.file.buffer, options);
  const result = await importService.apply(plan);
  res.json({ ok: true, result });
});

/** Crea las categorías / proveedores que vinieron en el Excel y no existen */
export const createMissing = asyncHandler(async (req, res) => {
  const categories = Array.isArray(req.body.categories) ? req.body.categories : [];
  const suppliers = Array.isArray(req.body.suppliers) ? req.body.suppliers : [];

  async function createMany(Model, names) {
    const existing = await Model.find({}, 'name slug order').lean();
    const normSet = new Set(existing.map((e) => matchKey(e.name)));
    const slugSet = new Set(existing.map((e) => e.slug));
    let order = Math.max(0, ...existing.map((e) => e.order || 0));
    const docs = [];
    names
      .map((n) => String(n).trim())
      .filter((n) => n.length >= 2 && n.length <= 50)
      .forEach((n) => {
        const key = matchKey(n);
        if (normSet.has(key)) return;
        normSet.add(key);
        const name = toTitleCase(n);
        docs.push({ name, normalizedName: normalizeText(name), slug: uniqueSlug(slugify(name), slugSet), order: ++order, active: true });
      });
    if (docs.length) await Model.insertMany(docs);
    return docs.length;
  }

  const createdCategories = await createMany(Category, categories);
  const createdSuppliers = await createMany(Supplier, suppliers);
  res.json({ ok: true, createdCategories, createdSuppliers });
});
