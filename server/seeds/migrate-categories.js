/**
 * Migración de categorías para una base existente (se puede correr más de una vez):
 * 1. "Artículos Varios" (slug articulos-varios) pasa a "Variedades" (slug variedades) CONSERVANDO el _id,
 *    así los productos y promociones que la usan no se tocan.
 *    Si ya existían las dos, los productos/promos de la vieja pasan a Variedades y la vieja se borra.
 * 2. Crea "Snacks" y deja todas en el orden nuevo (reusa el seed de categorías).
 *
 * Uso: npm run migrate:categories
 */
import run, { isMain } from './_run.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import { normalizeText } from '../utils/text.js';
import seedCategories from './categories.seed.js';

const OLD_SLUG = 'articulos-varios';
const NEW = { slug: 'variedades', name: 'Variedades' };

async function migrateCategories() {
  const [oldCat, newCat] = await Promise.all([Category.findOne({ slug: OLD_SLUG }), Category.findOne({ slug: NEW.slug })]);

  if (oldCat && !newCat) {
    await Category.updateOne({ _id: oldCat._id }, { $set: { slug: NEW.slug, name: NEW.name, normalizedName: normalizeText(NEW.name) } });
    console.log(`  ~ "${oldCat.name}" renombrada a "${NEW.name}" (mismo _id ${oldCat._id})`);
  } else if (oldCat && newCat) {
    const [prods, promos] = await Promise.all([
      Product.updateMany({ category: oldCat._id }, { $set: { category: newCat._id } }),
      Promotion.updateMany({ categories: oldCat._id }, { $addToSet: { categories: newCat._id } }),
    ]);
    await Promotion.updateMany({ categories: oldCat._id }, { $pull: { categories: oldCat._id } });
    await Category.deleteOne({ _id: oldCat._id });
    console.log(`  ~ Existían las dos: ${prods.modifiedCount} productos y ${promos.modifiedCount} promos pasaron a "${NEW.name}"; se borró "${oldCat.name}"`);
  } else {
    console.log(`  = No hay "${OLD_SLUG}" para migrar`);
  }

  await seedCategories(); // crea Snacks y actualiza nombres/orden por slug
}

export default migrateCategories;
if (isMain(import.meta.url)) run('migrate:categories', migrateCategories);
