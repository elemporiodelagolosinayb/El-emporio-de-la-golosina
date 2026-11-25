import { z } from 'zod';
import { normalizePhone } from '../utils/phone';
import { isTrivialPin } from '../utils/pin';

/* Mismas reglas que server/validators/* */

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const objectId = /^[a-f\d]{24}$/i;

export const phoneField = z
  .string({ required_error: 'Ingresá tu celular' })
  .trim()
  .min(1, 'Ingresá tu celular')
  .refine((v) => normalizePhone(v) !== null, 'Ingresá un celular válido (ej: 381 1234567)');

export const pinField = z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 números');

export const customerNameField = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener entre 2 y 60 caracteres')
  .max(60, 'El nombre debe tener entre 2 y 60 caracteres')
  .regex(NAME_REGEX, 'El nombre solo puede tener letras y espacios');

/** Nombre completo: nombre y apellido (misma regla que fullNameRule del back) */
export const fullNameField = customerNameField.refine(
  (v) => v.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2,
  'Escribí tu nombre y apellido'
);

export const phoneSchema = z.object({ phone: phoneField });
export const pinLoginSchema = z.object({ pin: pinField });
export const registerSchema = z
  .object({
    name: customerNameField,
    pin: pinField.refine((v) => !isTrivialPin(v), 'Elegí un PIN menos obvio (no 1234, 0000, 1111…)'),
    pinConfirm: z.string(),
  })
  .refine((d) => d.pin === d.pinConfirm, { message: 'Los PIN no coinciden', path: ['pinConfirm'] });

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Ingresá la contraseña'),
});

export const checkoutSchema = z.object({
  name: fullNameField,
  phone: phoneField,
  notes: z.string().max(300, 'Las observaciones no pueden superar 300 caracteres').optional(),
});

// ---------- Admin ----------

const priceField = (label = 'El precio') =>
  z.coerce
    .number({ invalid_type_error: `${label} debe ser un número` })
    .min(0, `${label} debe ser un número mayor o igual a 0`)
    .max(1e8, `${label} debe ser un número mayor o igual a 0`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), `${label} admite hasta 2 decimales`);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener entre 2 y 120 caracteres').max(120, 'El nombre debe tener entre 2 y 120 caracteres'),
    code: z.string().trim().max(40, 'Código demasiado largo').optional().or(z.literal('')),
    category: z.string().regex(objectId, 'Elegí una categoría'),
    supplier: z.string().regex(objectId, 'Proveedor inválido').optional().or(z.literal('')),
    price: priceField(),
    stock: z.coerce.number({ invalid_type_error: 'El stock debe ser un número' }).int('El stock tiene que ser un número entero, 0 o más').min(0, 'El stock no puede ser negativo'),
    description: z.string().max(1000, 'Descripción demasiado larga').optional(),
    active: z.boolean().optional(),
    featured: z.boolean().optional(),
  });

/** Nota de "Marcar para revisar" (opcional, hasta 200 caracteres) */
export const reviewNoteSchema = z.string().trim().max(200, 'La nota no puede superar los 200 caracteres');

export const namedEntitySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener entre 2 y 50 caracteres').max(50, 'El nombre debe tener entre 2 y 50 caracteres'),
  icon: z.string().max(8, 'Usá un solo emoji como ícono').optional(),
  active: z.boolean().optional(),
});

/** "YYYY-MM-DDTHH:mm" (hora AR) → Date */
const arDate = (v) => new Date(`${v}:00-03:00`);
const optionalMoney = (label) =>
  z.union([z.literal(''), z.coerce.number({ invalid_type_error: `${label} tiene que ser un número` }).positive(`${label} tiene que ser mayor a 0`).max(1e8)]).optional();

/** Promoción = descuento en % (mismas reglas que server/validators/catalog.validator.js) */
export const promotionSchema = (isEdit) =>
  z
    .object({
      title: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'El nombre no puede superar los 120 caracteres'),
      description: z.string().trim().max(500, 'La descripción no puede superar los 500 caracteres').optional(),
      discountPercent: z.coerce.number({ invalid_type_error: 'Poné el porcentaje' }).int('Sin decimales').min(1, 'Poné un porcentaje entre 1 y 100').max(100, 'Poné un porcentaje entre 1 y 100'),
      occasion: z.string(),
      occasionName: z.string().trim().max(40, 'Hasta 40 caracteres').optional(),
      scope: z.enum(['all', 'categories', 'products'], { message: 'Elegí a qué productos se aplica' }),
      categories: z.array(z.string()).optional(),
      products: z.array(z.string()).optional(),
      startDate: z.string().min(1, 'Elegí cuándo empieza'),
      endDate: z.string().min(1, 'Elegí cuándo termina'),
      active: z.boolean().optional(),
      price: optionalMoney('El precio para mostrar'),
      regularPrice: optionalMoney('El precio normal'),
      showInPopup: z.boolean().optional(),
    })
    .superRefine((d, ctx) => {
      const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
      if (d.scope === 'categories' && !d.categories?.length) issue('categories', 'Elegí al menos una categoría');
      if (d.scope === 'products' && !d.products?.length) issue('products', 'Elegí al menos un producto');
      if (d.occasion === 'otra' && !d.occasionName?.trim()) issue('occasionName', 'Escribí el nombre de la fecha');
      if (!isEdit && d.endDate && arDate(d.endDate) <= new Date()) issue('endDate', 'No puede terminar en el pasado');
      if (d.startDate && d.endDate && arDate(d.endDate) <= arDate(d.startDate)) issue('endDate', 'Tiene que terminar después de que empieza');
      if (d.price && d.regularPrice && Number(d.regularPrice) <= Number(d.price)) issue('regularPrice', 'Tiene que ser mayor al precio de la promo');
    });

export const customerEditSchema = z.object({ name: customerNameField, phone: phoneField });

export const adminUserSchema = (isEdit) =>
  z.object({
    name: z.string().trim().min(2, 'Nombre entre 2 y 60 caracteres').max(60),
    email: z.string().trim().email('Correo electrónico inválido'),
    password: isEdit
      ? z.string().refine((v) => !v || v.length >= 8, 'La contraseña debe tener al menos 8 caracteres')
      : z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  });

const optionalUrl = z.string().trim().refine((v) => !v || /^https?:\/\/.+\..+/.test(v), 'El link no es válido (tiene que empezar con https://)');

export const settingsSchema = z.object({
  topbarText: z.string().max(80, 'Máximo 80 caracteres'),
  address: z.string().max(150),
  mapsUrl: optionalUrl,
  scheduleText: z.string().max(150),
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  whatsapp: phoneField,
  lowStockThreshold: z.coerce.number().int('Poné un número entero (ej: 5)').min(0, 'Poné un número entero (ej: 5)'),
  minOrderAmount: z.coerce.number().min(0, 'Monto inválido'),
  postPurchaseMessage: z.string().max(400),
  bank: z.object({
    alias: z.string().trim().refine((v) => !v || /^[A-Za-z0-9.-]{6,20}$/.test(v), 'El alias debe tener 6 a 20 caracteres (letras, números, puntos y guiones)'),
    cbu: z.string().trim().refine((v) => !v || /^\d{22}$/.test(v), 'El CBU/CVU debe tener 22 dígitos'),
    holder: z.string().max(80),
    bankName: z.string().max(60),
  }),
  schedule: z
    .array(
      z.object({
        day: z.number(),
        closed: z.boolean(),
        ranges: z
          .array(z.object({ open: z.string().regex(TIME_REGEX, 'Hora inválida (ej: 08:30)'), close: z.string().regex(TIME_REGEX, 'Hora inválida (ej: 08:30)') }).refine((r) => r.close > r.open, { message: 'La hora de cierre tiene que ser después de la de apertura', path: ['close'] }))
          .max(2),
      })
    )
    .length(7),
});

/** Aplica los errores del back ({ field, msg }) a react-hook-form */
export function applyServerErrors(err, setError) {
  const errors = err?.response?.data?.errors || [];
  errors.forEach((e) => e.field && setError(e.field, { type: 'server', message: e.msg }));
  return errors.length > 0;
}
