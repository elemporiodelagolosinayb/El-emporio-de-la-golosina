import rateLimit from 'express-rate-limit';

/**
 * Rate limits en memoria (best effort): en Vercel cada instancia tiene su propia memoria,
 * por eso el bloqueo real del login de clientes se guarda en el documento Customer.
 */
const message = { ok: false, message: 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.', errors: [] };

/**
 * Solo cuenta las acciones que escriben (POST/PUT/PATCH/DELETE). La navegación (GET) no se limita:
 * con datos móviles muchos clientes comparten la misma IP pública y no deben bloquearse entre sí.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message });

export { apiLimiter, authLimiter };
