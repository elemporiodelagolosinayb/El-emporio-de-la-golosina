import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import env from './config/env.js';
import ensureDb from './middlewares/ensureDb.js';
import { apiLimiter } from './middlewares/rateLimits.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1); // Vercel / proxies: IP real para el rate limit
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Permite requests sin origin (curl, health checks) y los del whitelist
      if (!origin || env.CLIENT_URLS.includes(origin.replace(/\/$/, ''))) return cb(null, true);
      // En desarrollo, cualquier puerto de localhost (Vite usa 5174, 5175… si el 5173 está ocupado)
      if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
      return cb(ApiError.forbidden('No se pudo conectar con la tienda desde esta dirección.'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

app.get('/', (req, res) => res.json({ ok: true, name: 'API El Emporio de la Golosina' }));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api', apiLimiter, ensureDb, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
