import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signCustomerToken } from '../middlewares/auth.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const publicCustomer = (c) => ({ id: c._id, name: c.name, phone: c.phone });

/** Paso 1: ¿el celular ya tiene cuenta? */
export const checkPhone = asyncHandler(async (req, res) => {
  const exists = await Customer.exists({ phone: req.body.phone });
  res.json({ ok: true, exists: Boolean(exists), phone: req.body.phone });
});

/** Alta: celular + nombre + PIN (se guarda hasheado) */
export const register = asyncHandler(async (req, res) => {
  const { phone, name, pin } = req.body;
  if (await Customer.exists({ phone })) {
    throw ApiError.conflict('Ese celular ya tiene una cuenta. Ingresá con tu PIN.', [{ field: 'phone', msg: 'Celular ya registrado' }]);
  }
  const pinHash = await bcrypt.hash(pin, 10);
  const customer = await Customer.create({ phone, name: name.replace(/\s+/g, ' ').trim(), pinHash });
  res.status(201).json({ ok: true, token: signCustomerToken(customer), customer: publicCustomer(customer) });
});

/**
 * Login con PIN. El bloqueo (5 intentos → 15 min) se guarda en el documento,
 * porque en Vercel el rate limit en memoria no se comparte entre instancias.
 */
export const login = asyncHandler(async (req, res) => {
  const { phone, pin } = req.body;
  const customer = await Customer.findOne({ phone }).select('+pinHash');
  if (!customer) throw ApiError.notFound('No encontramos una cuenta con ese celular');

  if (customer.lockUntil && customer.lockUntil > new Date()) {
    const minutes = Math.ceil((customer.lockUntil - Date.now()) / 60000);
    throw new ApiError(429, `Demasiados intentos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`, [
      { field: 'pin', msg: 'Cuenta bloqueada temporalmente' },
    ]);
  }

  const valid = await bcrypt.compare(pin, customer.pinHash);
  if (!valid) {
    const attempts = (customer.failedAttempts || 0) + 1;
    const update =
      attempts >= MAX_ATTEMPTS
        ? { failedAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
        : { failedAttempts: attempts };
    await Customer.updateOne({ _id: customer._id }, update);
    const left = MAX_ATTEMPTS - attempts;
    const msg =
      attempts >= MAX_ATTEMPTS
        ? `PIN incorrecto. Bloqueamos el acceso por ${LOCK_MINUTES} minutos.`
        : `PIN incorrecto. Te queda${left === 1 ? '' : 'n'} ${left} intento${left === 1 ? '' : 's'}.`;
    throw ApiError.unauthorized(msg);
  }

  if (customer.failedAttempts || customer.lockUntil) {
    await Customer.updateOne({ _id: customer._id }, { failedAttempts: 0, lockUntil: null });
  }
  res.json({ ok: true, token: signCustomerToken(customer), customer: publicCustomer(customer) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, customer: publicCustomer(req.customer) });
});

/*
 * Preparado para el futuro (NO implementado): validación por código OTP vía WhatsApp/SMS.
 * - POST /api/auth/otp/request  → genera código, lo guarda hasheado con vencimiento y lo envía.
 * - POST /api/auth/otp/verify   → valida el código y marca phoneVerified = true.
 */
