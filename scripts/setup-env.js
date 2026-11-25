/**
 * Se ejecuta antes de `npm run dev`: si falta algún .env, lo crea a partir del .env.example
 * (en el server además genera secretos JWT aleatorios). Nunca pisa un .env existente.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const secret = () => crypto.randomBytes(48).toString('hex');

function ensureEnv(dir, transform = (s) => s) {
  const envPath = path.join(root, dir, '.env');
  const examplePath = path.join(root, dir, '.env.example');
  if (fs.existsSync(envPath)) return;
  const content = transform(fs.readFileSync(examplePath, 'utf8'));
  fs.writeFileSync(envPath, content);
  console.log(`✔ Creado ${dir}/.env a partir de .env.example`);
}

ensureEnv('server', (s) =>
  s
    .replace(/^JWT_SECRET_ADMIN=.*$/m, `JWT_SECRET_ADMIN=${secret()}`)
    .replace(/^JWT_SECRET_CUSTOMER=.*$/m, `JWT_SECRET_CUSTOMER=${secret()}`)
);
ensureEnv('client');
