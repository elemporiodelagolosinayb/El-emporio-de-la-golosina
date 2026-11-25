import { connectDB } from '../config/db.js';

/** Garantiza la conexión a MongoDB antes de cada request (clave en serverless) */
export default async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Error conectando a MongoDB', err.message);
    res.status(503).json({ ok: false, message: 'La tienda no está disponible en este momento. Probá de nuevo en unos segundos.', errors: [] });
  }
};
