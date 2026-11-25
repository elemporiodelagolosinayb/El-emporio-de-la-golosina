import { body, param } from 'express-validator';
import { normalizePhone } from '../utils/phone.js';
import { isTrivialPin } from '../utils/pin.js';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Celular: lo normaliza y deja req.body[field] en formato 549XXXXXXXXXX */
const phoneRule = (field = 'phone', { optional = false } = {}) => {
  let chain = body(field);
  if (optional) chain = chain.optional({ values: 'falsy' });
  return chain
    .customSanitizer((v) => normalizePhone(v) || v)
    .custom((v) => /^549\d{10}$/.test(String(v)))
    .withMessage('Ingresá un celular válido (ej: 381 1234567)');
};

const pinRule = (field = 'pin') =>
  body(field)
    .isString()
    .withMessage('El PIN es obligatorio')
    .matches(/^\d{4}$/)
    .withMessage('El PIN debe tener exactamente 4 números');

const newPinRules = () => [
  pinRule('pin').custom((v) => !isTrivialPin(v)).withMessage('Elegí un PIN menos obvio (no 1234, 0000, 1111…)'),
  body('pinConfirm')
    .custom((v, { req }) => v === req.body.pin)
    .withMessage('Los PIN no coinciden'),
];

const customerNameRule = (field = 'name') =>
  body(field)
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('El nombre debe tener entre 2 y 60 caracteres')
    .matches(NAME_REGEX)
    .withMessage('El nombre solo puede tener letras y espacios');

/** Nombre completo: como customerNameRule + al menos nombre y apellido */
const fullNameRule = (field = 'name') =>
  customerNameRule(field)
    .bail()
    .custom((v) => String(v).trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2)
    .withMessage('Escribí tu nombre y apellido')
    .customSanitizer((v) => String(v).replace(/\s+/g, ' ').trim());

const idParam = (name = 'id') => param(name).isMongoId().withMessage('No encontramos ese elemento');

/** Imagen subida a Cloudinary: { url, public_id } dentro de la carpeta emporio/ */
const imageRule = (field) =>
  body(field)
    .optional({ values: 'null' })
    .custom((v) => {
      if (v === null) return true;
      if (typeof v !== 'object' || typeof v.url !== 'string' || typeof v.public_id !== 'string') return false;
      return /^https:\/\/res\.cloudinary\.com\//.test(v.url) && v.public_id.startsWith('emporio/');
    })
    .withMessage('Imagen inválida');

export { phoneRule, pinRule, newPinRules, customerNameRule, fullNameRule, idParam, imageRule, NAME_REGEX, TIME_REGEX };
