import { body } from 'express-validator';
import { phoneRule, customerNameRule, TIME_REGEX } from './common.js';

const adminCreate = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Nombre entre 2 y 60 caracteres'),
  body('email').trim().isEmail().withMessage('Correo electrónico inválido').toLowerCase(),
  body('password').isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
];
const adminUpdate = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Nombre entre 2 y 60 caracteres'),
  body('email').trim().isEmail().withMessage('Correo electrónico inválido').toLowerCase(),
  body('password').optional({ values: 'falsy' }).isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
];

const customerUpdate = [customerNameRule(), phoneRule()];

const url = (field) =>
  body(field).optional({ values: 'falsy' }).trim().isURL({ protocols: ['https', 'http'], require_protocol: true }).withMessage('El link no es válido (tiene que empezar con https://)');

const settings = [
  body('topbarText').optional().trim().isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('address').optional().trim().isLength({ max: 150 }),
  url('mapsUrl'),
  url('instagram'),
  url('facebook'),
  url('tiktok'),
  body('scheduleText').optional().trim().isLength({ max: 150 }),
  body('schedule').optional().isArray({ min: 7, max: 7 }).withMessage('El horario debe tener los 7 días'),
  body('schedule.*.day').optional().isInt({ min: 0, max: 6 }),
  body('schedule.*.closed').optional().isBoolean(),
  body('schedule.*.ranges').optional().isArray({ max: 2 }).withMessage('Máximo 2 franjas por día'),
  body('schedule.*.ranges.*.open').optional().matches(TIME_REGEX).withMessage('Hora inválida (ej: 08:30)'),
  body('schedule.*.ranges.*.close')
    .optional()
    .matches(TIME_REGEX)
    .withMessage('Hora inválida (ej: 08:30)'),
  phoneRule('whatsapp', { optional: true }),
  body('bank.alias')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[A-Za-z0-9.-]{6,20}$/)
    .withMessage('El alias debe tener 6 a 20 caracteres (letras, números, puntos y guiones)'),
  body('bank.cbu').optional({ values: 'falsy' }).trim().matches(/^\d{22}$/).withMessage('El CBU/CVU debe tener 22 dígitos'),
  body('bank.holder').optional().trim().isLength({ max: 80 }),
  body('bank.bankName').optional().trim().isLength({ max: 60 }),
  body('lowStockThreshold').optional().isInt({ min: 0, max: 100000 }).withMessage('Poné un número entero (ej: 5)').toInt(),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('Monto inválido').toFloat(),
  body('postPurchaseMessage').optional().trim().isLength({ max: 400 }),
  body('promoPopupEnabled').optional().isBoolean().toBoolean(),
];

export { adminCreate, adminUpdate, customerUpdate, settings };
