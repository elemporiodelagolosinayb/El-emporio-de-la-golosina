import { body } from 'express-validator';
import { imageRule } from './common.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';

/** Categoría / Proveedor: nombre 2–50 (la unicidad sin tildes/mayúsculas la valida el índice normalizedName) */
const namedEntity = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('order').optional().isInt({ min: 0 }).withMessage('El orden debe ser un número entero').toInt(),
  body('active').optional().isBoolean().withMessage('Valor inválido').toBoolean(),
];

const category = [...namedEntity, body('icon').optional().trim().isLength({ max: 8 }).withMessage('Usá un solo emoji como ícono')];
const supplier = [...namedEntity, imageRule('logo')];

const priceRule = (field, label = 'El precio') =>
  body(field)
    .isFloat({ min: 0, max: 1e8 })
    .withMessage(`${label} debe ser un número mayor o igual a 0`)
    .bail()
    .custom((v) => /^\d+(\.\d{1,2})?$/.test(String(Number(v))))
    .withMessage(`${label} admite hasta 2 decimales`)
    .toFloat();

const product = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres'),
  body('code').optional({ values: 'falsy' }).trim().isLength({ max: 40 }).withMessage('Código demasiado largo'),
  priceRule('price'),
  body('stock').isInt({ min: 0 }).withMessage('El stock tiene que ser un número entero, 0 o más').toInt(),
  body('category')
    .isMongoId()
    .withMessage('Elegí una categoría')
    .bail()
    .custom(async (id) => {
      if (!(await Category.exists({ _id: id }))) throw new Error('La categoría no existe');
    }),
  body('supplier')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Proveedor inválido')
    .bail()
    .custom(async (id) => {
      if (!(await Supplier.exists({ _id: id }))) throw new Error('El proveedor no existe');
    }),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Descripción demasiado larga'),
  body('active').optional().isBoolean().toBoolean(),
  body('featured').optional().isBoolean().toBoolean(),
  imageRule('image'),
];

/** Edición rápida inline (precio / stock / activo) */
const productQuick = [
  body('price').optional().isFloat({ min: 0, max: 1e8 }).withMessage('Precio inválido').toFloat(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido').toInt(),
  body('active').optional().isBoolean().toBoolean(),
  body('featured').optional().isBoolean().toBoolean(),
];

/** Marca "para revisar": un producto o varios (hasta 500) */
const reviewFields = [
  body('needsReview').isBoolean().withMessage('Valor inválido').toBoolean(),
  body('reviewNote').optional({ values: 'null' }).isString().trim().isLength({ max: 200 }).withMessage('La nota no puede superar los 200 caracteres'),
];
const productReview = reviewFields;
const productReviewBulk = [
  body('ids').isArray({ min: 1, max: 500 }).withMessage('Seleccioná entre 1 y 500 productos'),
  body('ids.*').isMongoId().withMessage('Producto inválido'),
  ...reviewFields,
];

const productBulk = [
  body('ids').isArray({ min: 1, max: 1000 }).withMessage('Seleccioná al menos un producto'),
  body('ids.*').isMongoId(),
  body('action').isIn(['delete', 'activate', 'deactivate', 'category', 'supplier']).withMessage('Acción inválida'),
  body('value').optional({ values: 'null' }).isMongoId().withMessage('Valor inválido'),
];

import { OCCASIONS, SCOPES } from '../models/Promotion.js';
import { parseARDateTime } from '../utils/dates.js';

const optionalMoney = (field, label) =>
  body(field)
    .optional({ values: 'falsy' })
    .isFloat({ gt: 0, max: 1e8 })
    .withMessage(`${label} tiene que ser un número mayor a 0`)
    .toFloat();

const promotion = [
  body('title').trim().isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('La descripción no puede superar los 500 caracteres'),
  body('discountPercent').isInt({ min: 1, max: 100 }).withMessage('Poné un porcentaje entre 1 y 100').toInt(),
  body('occasion').optional().isIn(Object.keys(OCCASIONS)).withMessage('Ocasión inválida'),
  body('occasionName')
    .if(body('occasion').equals('otra'))
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage('Escribí el nombre de la fecha (hasta 40 caracteres)'),
  body('scope').isIn(SCOPES).withMessage('Elegí a qué productos se aplica'),
  body('categories')
    .if(body('scope').equals('categories'))
    .isArray({ min: 1 })
    .withMessage('Elegí al menos una categoría'),
  body('categories.*').optional().isMongoId(),
  body('products')
    .if(body('scope').equals('products'))
    .isArray({ min: 1 })
    .withMessage('Elegí al menos un producto'),
  body('products.*').optional().isMongoId(),
  body('startDate')
    .custom((v) => !Number.isNaN(parseARDateTime(v).getTime()))
    .withMessage('Elegí cuándo empieza'),
  body('endDate')
    .custom((v) => !Number.isNaN(parseARDateTime(v, { endOfDay: true }).getTime()))
    .withMessage('Elegí cuándo termina')
    .bail()
    .custom((v, { req }) => parseARDateTime(v, { endOfDay: true }) > parseARDateTime(req.body.startDate))
    .withMessage('Tiene que terminar después de que empieza'),
  optionalMoney('price', 'El precio para mostrar'),
  optionalMoney('regularPrice', 'El precio normal'),
  body('regularPrice')
    .optional({ values: 'falsy' })
    .custom((v, { req }) => !req.body.price || Number(v) > Number(req.body.price))
    .withMessage('Tiene que ser mayor al precio de la promo'),
  body('active').optional().isBoolean().toBoolean(),
  body('showInPopup').optional().isBoolean().toBoolean(),
  imageRule('image'),
];

export { category, supplier, product, productQuick, productBulk, productReview, productReviewBulk, promotion };
