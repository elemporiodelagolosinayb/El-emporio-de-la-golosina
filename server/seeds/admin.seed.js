import run, { isMain } from './_run.js';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!email || !password) throw new Error('Definí ADMIN_EMAIL y ADMIN_PASSWORD en el .env');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');

  if (await Admin.exists({ email })) {
    console.log(`  El admin ${email} ya existe, no se modifica.`);
    return;
  }
  await Admin.create({ name, email, password: await bcrypt.hash(password, 12) });
  console.log(`  Admin creado: ${email}`);
}

export default seedAdmin;
if (isMain(import.meta.url)) run('admin', seedAdmin);
