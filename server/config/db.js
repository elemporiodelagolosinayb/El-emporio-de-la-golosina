import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

mongoose.set('strictQuery', true);

/**
 * Conexión cacheada en una variable global para reutilizarla
 * entre invocaciones serverless de Vercel (evita abrir una conexión por request).
 */
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

/**
 * Solo desarrollo: si MONGO_URI está vacío, levanta un MongoDB local con
 * mongodb-memory-server, persistido en server/.devdb, y carga los datos iniciales.
 */
async function devDatabaseUri() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Falta MONGO_URI (obligatorio en producción)');
  }
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  } catch {
    throw new Error('Falta MONGO_URI. Cargá la URI de MongoDB Atlas en server/.env o instalá las dependencias de desarrollo.');
  }
  const dbPath = path.join(__dirname, '..', '.devdb');
  fs.mkdirSync(dbPath, { recursive: true });
  console.log('ℹ️  MONGO_URI vacío: usando MongoDB local de desarrollo (server/.devdb)…');
  const server = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
  global._devMongo = server;
  return server.getUri('emporio');
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = (async () => {
      const usingDev = !env.MONGO_URI;
      const uri = usingDev ? await devDatabaseUri() : env.MONGO_URI;
      const conn = await mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 10 });
      if (usingDev) await (await import('../seeds/index.js')).seedIfEmpty();
      return conn;
    })();
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export { connectDB };
