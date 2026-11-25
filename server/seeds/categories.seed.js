import run, { isMain } from './_run.js';
import Category from '../models/Category.js';
import { normalizeText } from '../utils/text.js';

const CATEGORIES = [
  { order: 1, name: 'Alfajores', slug: 'alfajores', icon: '🍫' },
  { order: 2, name: 'Golosinas', slug: 'golosinas', icon: '🍬' },
  { order: 3, name: 'Galletas', slug: 'galletas', icon: '🍪' },
  { order: 4, name: 'Chocolates', slug: 'chocolates', icon: '🍫' },
  { order: 5, name: 'Turrones', slug: 'turrones', icon: '🥜' },
  { order: 6, name: 'Barritas', slug: 'barritas', icon: '🥨' },
  { order: 7, name: 'Chicles y Caramelos', slug: 'chicles-y-caramelos', icon: '🍭' },
  { order: 8, name: 'Snacks', slug: 'snacks', icon: '🥔' },
  { order: 9, name: 'Variedades', slug: 'variedades', icon: '🛍️' },
  { order: 10, name: 'Temporadas', slug: 'temporadas', icon: '🎁' },
  { order: 11, name: 'Promos', slug: 'promos', icon: '🔥' },
];

/**
 * Idempotente: busca cada categoría por slug y actualiza nombre y orden.
 * El ícono y "activa" solo se ponen al crearla (se respeta lo que se editó en el admin).
 */
async function seedCategories() {
  const existing = new Map((await Category.find({ slug: { $in: CATEGORIES.map((c) => c.slug) } }, 'slug name order').lean()).map((c) => [c.slug, c]));
  for (const c of CATEGORIES) {
    const normalizedName = normalizeText(c.name);
    const found = existing.get(c.slug);
    if (!found) {
      await Category.create({ ...c, normalizedName, active: true });
      console.log(`  + creada      ${c.order}. ${c.name}`);
    } else if (found.name !== c.name || found.order !== c.order) {
      await Category.updateOne({ _id: found._id }, { $set: { name: c.name, normalizedName, order: c.order } });
      console.log(`  ~ actualizada ${c.order}. ${c.name}`);
    } else {
      console.log(`  = sin cambios ${c.order}. ${c.name}`);
    }
  }
}

export { CATEGORIES };

export default seedCategories;
if (isMain(import.meta.url)) run('categories', seedCategories);
