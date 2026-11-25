import run, { isMain } from './_run.js';
import Settings from '../models/Settings.js';
import seedSettings from './settings.seed.js';
import seedCategories from './categories.seed.js';
import seedSuppliers from './suppliers.seed.js';
import seedAdmin from './admin.seed.js';

async function seedAll() {
  await seedSettings();
  await seedCategories();
  await seedSuppliers();
  await seedAdmin();
}

/** Base local de desarrollo: carga los datos iniciales solo la primera vez */
async function seedIfEmpty() {
  if (await Settings.exists({ key: 'main' })) return;
  console.log('▶ Base de desarrollo vacía: cargando datos iniciales…');
  await seedAll();
  console.log(`✔ Listo. Panel: http://localhost:5173/admin  ·  ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
}

export { seedAll, seedIfEmpty };

if (isMain(import.meta.url)) run('all', seedAll);
