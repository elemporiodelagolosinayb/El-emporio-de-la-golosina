import run, { isMain } from './_run.js';
import Supplier from '../models/Supplier.js';
import { normalizeText, matchKey, uniqueSlug } from '../utils/text.js';

const SUPPLIERS = [
  'Arcor', 'Misky', 'Georgalos', 'Mondelez', 'Don Satur', 'Fantoche', 'Bonafide', 'Oblitas', 'Trío', 'Mauri', 'Nevares', 'Pipas', 'Mantecol', 'Gula', 'Ducrem',
  // Proveedores del catálogo de productos (seed:products)
  'Solitas', 'Fibusia', 'Granix', 'Swift', 'Reno', 'Zingaras', 'Focu', 'Lheritier', 'Fel Fort', 'Nestlé', 'Good Show', 'Planeta Dulce', 'Docile', 'Paysandú', 'Que Rico', 'Bibi', 'Helatec', 'Ferrero',
];

/**
 * Idempotente: un proveedor ya existe si coincide sin mayúsculas, tildes, apóstrofes ni espacios de más
 * ("L'Heritier" = "Lheritier"). Los existentes no se tocan (se respeta lo editado en el admin).
 */
async function seedSuppliers() {
  const existing = await Supplier.find({}, 'name slug order').lean();
  const byKey = new Map(existing.map((s) => [matchKey(s.name), s]));
  const slugs = new Set(existing.map((s) => s.slug));
  let order = Math.max(0, ...existing.map((s) => s.order || 0));

  for (const name of SUPPLIERS) {
    const found = byKey.get(matchKey(name));
    if (found) {
      console.log(`  = existente ${found.name}`);
      continue;
    }
    const doc = await Supplier.create({ name, normalizedName: normalizeText(name), slug: uniqueSlug(name, slugs), order: ++order, active: true });
    byKey.set(matchKey(name), doc);
    console.log(`  + creado    ${name}`);
  }
}

export { SUPPLIERS };

export default seedSuppliers;
if (isMain(import.meta.url)) run('suppliers', seedSuppliers);
