import * as XLSX from 'xlsx';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import ApiError from '../utils/ApiError.js';
import { normalizeText, matchKey, slugify, uniqueSlug } from '../utils/text.js';
import { deleteImages } from './cloudinary.service.js';

const MAX_ROWS = 3000;
// Mismo orden que la planilla que se descarga del admin (ida y vuelta sin cambios)
const COLUMNS = ['codigo', 'nombre', 'categoria', 'proveedor', 'precio', 'stock', 'activo', 'revisar', 'nota_revision'];
const REQUIRED_HEADERS = ['nombre'];
const REVIEW_NOTE_MAX = 200;
// Sin precio se publica igual, como "Consultar precio" (no se puede comprar hasta que tenga precio)
const NO_PRICE_WARNING = 'Sin precio: se publica como "Consultar precio"';
const NO_STOCK_WARNING = 'Sin stock: se publica como "Sin stock"';

/**
 * Opciones (como en la referencia):
 * - fields: qué columnas aplicar → "price", "stock", "category", "supplier", "name" (separadas por coma)
 * - createMissing: si un producto de la planilla no está en la tienda, crearlo (si no, se ignora)
 * - updateReview: aplicar las columnas "revisar" / "nota_revision" a los productos que ya existen
 *   (a los nuevos se les aplica siempre)
 * Nunca se borran productos y el stock siempre se reemplaza.
 */
function parseOptions(raw = {}) {
  const fields = String(raw.fields || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  const b = (v) => v === true || v === 'true' || v === '1';
  return {
    createNew: b(raw.createMissing),
    updatePrice: fields.includes('price'),
    updateStock: fields.includes('stock'),
    updateCategory: fields.includes('category'),
    updateSupplier: fields.includes('supplier'),
    updateName: fields.includes('name'),
    updateReview: b(raw.updateReview),
    updateActive: false,
    deleteMissing: false,
    stockMode: 'replace',
  };
}

/** Encabezados aceptados (sin tildes, mayúsculas ni símbolos) → columna interna */
const HEADER_ALIASES = {
  codigo: 'codigo', codigoid: 'codigo', id: 'codigo', cod: 'codigo', sku: 'codigo',
  nombre: 'nombre', producto: 'nombre', articulo: 'nombre',
  categoria: 'categoria', rubro: 'categoria',
  proveedor: 'proveedor', marca: 'proveedor',
  precio: 'precio', preciounitario: 'precio',
  stock: 'stock', cantidad: 'stock',
  activo: 'activo', activa: 'activo',
  revisar: 'revisar', revision: 'revisar', pararevisar: 'revisar',
  notarevision: 'nota_revision', notaderevision: 'nota_revision', nota: 'nota_revision',
};

/** ¿Es un .xlsx (zip "PK") o un .xls (OLE)? Si no, lo tratamos como texto CSV */
const isBinarySheet = (buf) => (buf[0] === 0x50 && buf[1] === 0x4b) || (buf[0] === 0xd0 && buf[1] === 0xcf);

/** Separador del CSV: el que más aparece en la primera línea (fuera de comillas) entre ; , y tab */
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '');
  const counts = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

/** Abre .xlsx / .xls / .csv (CSV con ; o , y con o sin BOM; en CSV todo se lee como texto) */
function readWorkbook(buffer) {
  if (isBinarySheet(buffer)) return XLSX.read(buffer, { type: 'buffer', cellDates: false, dense: true });
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  return XLSX.read(text, { type: 'string', FS: detectDelimiter(text), raw: true, dense: true });
}

/** Lee el archivo y devuelve filas con encabezados normalizados (case-insensitive, sin tildes) */
function readRows(buffer) {
  let wb;
  try {
    wb = readWorkbook(buffer);
  } catch {
    throw ApiError.badRequest('No pudimos leer el archivo. ¿Es un Excel válido?');
  }
  // Solo la hoja "Productos" si existe; si no, la primera (las demás, como "Referencias", se ignoran)
  const sheetName = wb.SheetNames.find((n) => normalizeText(n) === 'productos') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw ApiError.badRequest('El archivo no tiene hojas');

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false, raw: true });
  if (!matrix.length) throw ApiError.badRequest('El archivo está vacío');

  const headers = matrix[0].map((h) => HEADER_ALIASES[normalizeText(h).replace(/[^a-z]/g, '')] || normalizeText(h));
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw ApiError.badRequest('La planilla necesita la columna "Producto". Descargá la planilla desde acá y editá esa.');
  }
  if (!headers.includes('codigo') && !headers.includes('nombre')) {
    throw ApiError.badRequest('El archivo necesita la columna "codigo" o "nombre"');
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    const obj = {};
    COLUMNS.forEach((col) => {
      const idx = headers.indexOf(col);
      obj[col] = idx >= 0 ? line[idx] : '';
    });
    const isEmpty = COLUMNS.every((c) => String(obj[c] ?? '').trim() === '');
    if (!isEmpty) rows.push({ rowNumber: i + 1, data: obj });
  }
  if (rows.length > MAX_ROWS) throw ApiError.badRequest(`El archivo tiene ${rows.length} filas. El máximo es ${MAX_ROWS}.`);
  if (!rows.length) throw ApiError.badRequest('El archivo no tiene filas con datos');
  return rows;
}

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Número escrito como en Argentina o como texto → número (o NaN)
 * 1500 · "1500" · "1500,50" · "$1.500,50" · "$ 1.500" · "1,500.50" · " 12 "
 */
function parseNumber(v) {
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[$\s ]/g, '');
  if (s === '') return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // El último separador es el decimal; el otro es de miles
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    s = s.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // "1.500" / "12.500.000" = miles
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
const parsePrice = parseNumber;

function parseBool(v) {
  const s = normalizeText(v);
  if (['si', 's', 'true', '1', 'activo', 'yes'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'inactivo'].includes(s)) return false;
  return undefined;
}

/**
 * Analiza el Excel sin guardar nada (dry-run). Devuelve el plan de cambios.
 */
async function analyze(buffer, options) {
  const rows = readRows(buffer);

  const [products, categories, suppliers] = await Promise.all([
    Product.find({}, 'name normalizedName code category supplier price stock active image needsReview reviewNote').lean(),
    Category.find({}, 'name normalizedName').lean(),
    Supplier.find({}, 'name normalizedName').lean(),
  ]);

  const byCode = new Map();
  const byName = new Map();
  products.forEach((p) => {
    if (p.code) byCode.set(normalizeText(p.code), p);
    if (!byName.has(p.normalizedName)) byName.set(p.normalizedName, p);
  });
  // Categorías y proveedores se reconocen sin mayúsculas, tildes, apóstrofes ni espacios de más
  const catMap = new Map(categories.map((c) => [matchKey(c.name), c]));
  const catById = new Map(categories.map((c) => [String(c._id), c]));
  const supMap = new Map(suppliers.map((s) => [matchKey(s.name), s]));
  const supById = new Map(suppliers.map((s) => [String(s._id), s]));

  const toCreate = [];
  const toUpdate = [];
  const errors = [];
  const unchanged = [];
  const skipped = [];
  const warnings = [];
  const missingCategories = new Map();
  const missingSuppliers = new Map();
  const matchedIds = new Set();
  const seenKeys = new Map(); // detecta duplicados dentro del archivo

  for (const { rowNumber, data } of rows) {
    const rowErrors = [];
    const code = isBlank(data.codigo) ? '' : String(data.codigo).trim();
    const name = isBlank(data.nombre) ? '' : String(data.nombre).replace(/\s+/g, ' ').trim();
    const nameKey = slugify(name);

    // --- Identificación: primero por código, después por nombre normalizado
    let existing = null;
    if (code) existing = byCode.get(normalizeText(code)) || null;
    if (!existing && nameKey) existing = byName.get(nameKey) || null;

    // --- Duplicados en el mismo archivo
    const keys = [code && `c:${normalizeText(code)}`, nameKey && `n:${nameKey}`, existing && `id:${existing._id}`].filter(Boolean);
    const dupOf = keys.map((k) => seenKeys.get(k)).find(Boolean);
    if (dupOf) {
      errors.push({ row: rowNumber, data, reason: `Fila duplicada (igual a la fila ${dupOf})` });
      if (existing) matchedIds.add(String(existing._id));
      continue;
    }
    keys.forEach((k) => seenKeys.set(k, rowNumber));

    if (!existing && !name) {
      errors.push({ row: rowNumber, data, reason: code ? `Código "${code}" no encontrado y el nombre está vacío` : 'Nombre vacío' });
      continue;
    }
    if (existing) matchedIds.add(String(existing._id));

    // --- Parseo de campos (solo valida lo que viene con valor)
    let price;
    if (!isBlank(data.precio)) {
      price = parsePrice(data.precio);
      if (!Number.isFinite(price) || price < 0 || price > 1e8) rowErrors.push(`Precio inválido ("${data.precio}"): debe ser un número mayor o igual a 0`);
      else price = Math.round(price * 100) / 100;
    }
    let stock;
    if (!isBlank(data.stock)) {
      stock = parseNumber(data.stock);
      if (!Number.isInteger(stock) || stock < 0) rowErrors.push(`Stock inválido ("${data.stock}"): debe ser un entero mayor o igual a 0`);
    }
    let category;
    if (!isBlank(data.categoria)) {
      category = catMap.get(matchKey(data.categoria));
      if (!category) {
        rowErrors.push(`Categoría inexistente: "${String(data.categoria).trim()}"`);
        missingCategories.set(matchKey(data.categoria), String(data.categoria).trim());
      }
    }
    let supplier;
    if (!isBlank(data.proveedor)) {
      supplier = supMap.get(matchKey(data.proveedor));
      if (!supplier) {
        rowErrors.push(`Proveedor inexistente: "${String(data.proveedor).trim()}"`);
        missingSuppliers.set(matchKey(data.proveedor), String(data.proveedor).trim());
      }
    }
    let active;
    if (!isBlank(data.activo)) {
      active = parseBool(data.activo);
      if (active === undefined) rowErrors.push(`Valor de "activo" inválido ("${data.activo}"): usá SI o NO`);
    }
    // Marca de revisión (revisar SI/NO + nota)
    let needsReview;
    if (!isBlank(data.revisar)) {
      needsReview = parseBool(data.revisar);
      if (needsReview === undefined) rowErrors.push(`Revisión: valor de "revisar" inválido ("${data.revisar}"): usá SI o NO`);
    }
    const reviewNote = isBlank(data.nota_revision) ? '' : String(data.nota_revision).replace(/\s+/g, ' ').trim();
    if (reviewNote.length > REVIEW_NOTE_MAX) rowErrors.push(`Revisión: la nota supera los ${REVIEW_NOTE_MAX} caracteres`);

    // ================= PRODUCTO NUEVO =================
    if (!existing) {
      if (!options.createNew) {
        skipped.push({ row: rowNumber, name, reason: 'No está en la tienda (se ignora)' });
        continue;
      }
      if (name.length < 2 || name.length > 120) rowErrors.push('El nombre debe tener entre 2 y 120 caracteres');
      if (isBlank(data.categoria)) rowErrors.push('Falta la categoría (obligatoria para productos nuevos)');
      if (rowErrors.length) {
        errors.push({ row: rowNumber, data, reason: rowErrors.join(' · ') });
        continue;
      }
      // Sin precio o sin stock se crea igual (precio 0 / stock 0) y se avisa
      const warning = !(price > 0) ? NO_PRICE_WARNING : stock === undefined ? NO_STOCK_WARNING : '';
      if (warning) warnings.push({ row: rowNumber, name, reason: warning });
      toCreate.push({
        row: rowNumber,
        name,
        code: code || undefined,
        normalizedName: nameKey,
        category: String(category._id),
        categoryName: category.name,
        supplier: supplier ? String(supplier._id) : null,
        supplierName: supplier?.name || '',
        price: price ?? 0,
        stock: stock ?? 0,
        active: active ?? true,
        // A los productos nuevos la marca de revisión se les aplica siempre
        needsReview: needsReview === true,
        reviewNote: needsReview === true ? reviewNote : '',
        warning,
      });
      continue;
    }

    // ================= PRODUCTO EXISTENTE =================
    // Solo importan los errores de los campos que se van a aplicar
    const relevantErrors = rowErrors.filter(
      (e) =>
        (e.startsWith('Precio') && options.updatePrice) ||
        (e.startsWith('Stock') && options.updateStock) ||
        (e.startsWith('Categoría') && options.updateCategory) ||
        (e.startsWith('Proveedor') && options.updateSupplier) ||
        (e.startsWith('Valor de "activo"') && options.updateActive) ||
        (e.startsWith('Revisión') && options.updateReview)
    );
    if (relevantErrors.length) {
      errors.push({ row: rowNumber, data, reason: relevantErrors.join(' · ') });
      continue;
    }

    const changes = [];
    const set = {};
    let inc = null;

    if (options.updatePrice && price !== undefined && price !== existing.price) {
      changes.push({ field: 'precio', from: existing.price, to: price });
      set.price = price;
    }
    if (options.updateStock && stock !== undefined) {
      if (options.stockMode === 'sum') {
        if (stock !== 0) {
          changes.push({ field: 'stock', from: existing.stock, to: existing.stock + stock, note: `+${stock}` });
          inc = { stock };
        }
      } else if (stock !== existing.stock) {
        changes.push({ field: 'stock', from: existing.stock, to: stock });
        set.stock = stock;
      }
    }
    if (options.updateCategory && category && String(category._id) !== String(existing.category)) {
      changes.push({ field: 'categoria', from: catById.get(String(existing.category))?.name || '—', to: category.name });
      set.category = category._id;
    }
    if (options.updateSupplier && supplier && String(supplier._id) !== String(existing.supplier || '')) {
      changes.push({ field: 'proveedor', from: supById.get(String(existing.supplier))?.name || '—', to: supplier.name });
      set.supplier = supplier._id;
    }
    // Cambio de nombre: solo cuando la fila se reconoce por su código
    if (options.updateName && code && name && byCode.get(normalizeText(code)) === existing && name !== existing.name) {
      if (name.length < 2 || name.length > 120) {
        errors.push({ row: rowNumber, data, reason: 'El nombre debe tener entre 2 y 120 caracteres' });
        continue;
      }
      changes.push({ field: 'nombre', from: existing.name, to: name });
      set.name = name;
      set.normalizedName = slugify(name);
    }
    if (options.updateActive && active !== undefined && active !== existing.active) {
      changes.push({ field: 'activo', from: existing.active ? 'SI' : 'NO', to: active ? 'SI' : 'NO' });
      set.active = active;
    }
    // Marca de revisión: a los existentes solo si se tildó "Actualizar marca de revisión"
    if (options.updateReview && needsReview !== undefined) {
      const note = needsReview ? reviewNote : '';
      if (needsReview !== Boolean(existing.needsReview) || note !== (existing.reviewNote || '')) {
        changes.push({ field: 'revisar', from: existing.needsReview ? 'SI' : 'NO', to: needsReview ? 'SI' : 'NO', note: note || undefined });
        Object.assign(
          set,
          needsReview
            ? { needsReview: true, reviewNote: note, reviewedAt: null, reviewedBy: null }
            : { needsReview: false, reviewNote: '', reviewedAt: new Date(), reviewedBy: options.adminId || null }
        );
      }
    }

    if (!changes.length) {
      unchanged.push({ row: rowNumber, name: existing.name });
      continue;
    }
    toUpdate.push({ row: rowNumber, id: String(existing._id), name: existing.name, changes, set, inc });
  }

  const toDelete = options.deleteMissing
    ? products
        .filter((p) => !matchedIds.has(String(p._id)))
        .map((p) => ({ id: String(p._id), name: p.name, code: p.code || '', public_id: p.image?.public_id || null }))
    : [];

  return {
    options,
    totalRows: rows.length,
    summary: {
      create: toCreate.length,
      update: toUpdate.length,
      errors: errors.length,
      unchanged: unchanged.length,
      skipped: skipped.length,
      delete: toDelete.length,
      warnings: warnings.length,
      // Quedan "para revisar": los nuevos marcados + los existentes que pasan a SI
      review: toCreate.filter((p) => p.needsReview).length + toUpdate.filter((u) => u.set.needsReview === true).length,
    },
    toCreate,
    toUpdate,
    errors,
    unchanged,
    skipped,
    warnings,
    toDelete,
    missingCategories: [...missingCategories.values()],
    missingSuppliers: [...missingSuppliers.values()],
  };
}

/** Aplica el plan con bulkWrite (rápido y dentro del timeout de Vercel) */
async function apply(plan) {
  const ops = [];

  if (plan.toCreate.length) {
    const taken = new Set((await Product.find({}, 'slug').lean()).map((p) => p.slug));
    plan.toCreate.forEach((p) => {
      ops.push({
        insertOne: {
          document: {
            name: p.name,
            code: p.code,
            normalizedName: p.normalizedName,
            slug: uniqueSlug(p.name, taken),
            category: p.category,
            supplier: p.supplier,
            price: p.price,
            stock: p.stock,
            active: p.active,
            needsReview: p.needsReview,
            reviewNote: p.reviewNote,
          },
        },
      });
    });
  }

  plan.toUpdate.forEach((u) => {
    const update = {};
    if (Object.keys(u.set).length) update.$set = u.set;
    if (u.inc) update.$inc = u.inc;
    ops.push({ updateOne: { filter: { _id: u.id }, update } });
  });

  let created = 0;
  let updated = 0;
  const writeErrors = [];

  if (ops.length) {
    try {
      const res = await Product.bulkWrite(ops, { ordered: false });
      created = res.insertedCount;
      updated = res.modifiedCount;
    } catch (err) {
      // Con ordered:false, las operaciones válidas se aplican igual
      created = err.result?.insertedCount ?? err.result?.nInserted ?? 0;
      updated = err.result?.modifiedCount ?? err.result?.nModified ?? 0;
      (err.writeErrors || []).forEach((we) => {
        const op = ops[we.index];
        const name = op.insertOne?.document?.name || plan.toUpdate.find((u) => String(u.id) === String(op.updateOne?.filter?._id))?.name;
        writeErrors.push({ row: null, data: { nombre: name }, reason: we.errmsg?.includes('duplicate') ? 'Código duplicado' : we.errmsg });
      });
    }
  }

  let deleted = 0;
  if (plan.toDelete.length) {
    const ids = plan.toDelete.map((d) => d.id);
    const res = await Product.deleteMany({ _id: { $in: ids } });
    deleted = res.deletedCount;
    await deleteImages(plan.toDelete.map((d) => d.public_id));
  }

  return {
    created,
    updated,
    deleted,
    errors: [...plan.errors, ...writeErrors],
    errorCount: plan.errors.length + writeErrors.length,
    unchanged: plan.unchanged.length,
    skipped: plan.skipped.length,
    warnings: plan.warnings.length,
    review: plan.summary.review,
  };
}

export { analyze, apply, parseOptions, parseNumber, readRows, COLUMNS, MAX_ROWS, NO_PRICE_WARNING, NO_STOCK_WARNING };
