/** Helper para correr un seed por consola: conecta, ejecuta y desconecta */
import '../config/env.js';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { connectDB } from '../config/db.js';

/** true si el archivo se ejecutó directo con "node archivo.js" (equivale a require.main === module) */
export const isMain = (metaUrl) => Boolean(process.argv[1]) && metaUrl === pathToFileURL(process.argv[1]).href;

export default async function run(name, fn) {
  try {
    await connectDB();
    console.log(`▶ Seed ${name}…`);
    await fn();
    console.log(`✔ Seed ${name} listo`);
  } catch (err) {
    console.error(`✖ Seed ${name} falló:`, err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (global._devMongo) await global._devMongo.stop();
  }
};
