/**
 * Carga el catálogo inicial de productos desde una planilla, con el MISMO servicio que usa
 * "Planilla de productos" del admin (mismas validaciones y reglas).
 *
 * Uso:
 *   npm run seed:products                       → seeds/data/productos_emporio.csv
 *   npm run seed:products -- ruta/archivo.xlsx  → otro archivo (.csv, .xlsx o .xls)
 *
 * Opciones fijas: crear nuevos ✔ · actualizar existentes ✘ · marca de revisión ✔ (en los nuevos)
 * Es idempotente: los productos que ya están (por código o nombre) se saltean.
 * Antes corre los seeds de categorías y proveedores para que existan todos.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import run, { isMain } from './_run.js';
import seedCategories from './categories.seed.js';
import seedSuppliers from './suppliers.seed.js';
import * as importService from '../services/import.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(__dirname, 'data', 'productos_emporio.csv');

// A los nuevos la marca de revisión se aplica siempre. A los existentes no se les toca nada
// (si no, volver a correr el seed desharía los "Marcar como revisado" del admin).
const OPTIONS = importService.parseOptions({ createMissing: 'true', fields: '', updateReview: 'false' });

async function seedProducts(file = process.argv[2] || DEFAULT_FILE) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) throw new Error(`No existe el archivo ${filePath}`);

  console.log('  — Categorías');
  await seedCategories();
  console.log('  — Proveedores');
  await seedSuppliers();

  console.log(`  — Productos (${path.basename(filePath)})`);
  const plan = await importService.analyze(fs.readFileSync(filePath), OPTIONS);
  const result = await importService.apply(plan);

  const skipped = plan.summary.unchanged + plan.summary.skipped; // ya existían
  console.log(`
  Filas leídas ........ ${plan.totalRows}
  Creados ............. ${result.created}
  Salteados (ya están)  ${skipped}
  Advertencias ........ ${result.warnings}${result.warnings ? '  (sin precio → "Consultar precio")' : ''}
  Errores ............. ${result.errorCount}
  Para revisar ........ ${result.review}`);

  if (result.errorCount) {
    console.log('\n  Errores:');
    result.errors.slice(0, 30).forEach((e) => console.log(`   · fila ${e.row ?? '—'} ${e.data?.nombre || ''}: ${e.reason}`));
    if (result.errorCount > 30) console.log(`   … y ${result.errorCount - 30} más`);
  }
  return result;
}

export default seedProducts;
if (isMain(import.meta.url)) run('products', () => seedProducts());
