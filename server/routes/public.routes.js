import express from 'express';
const router = express.Router();
import validate from '../middlewares/validate.js';
import { idParam } from '../validators/common.js';
import { cartItems } from '../validators/order.validator.js';
import * as settings from '../controllers/settings.controller.js';
import categories from '../controllers/category.controller.js';
import suppliers from '../controllers/supplier.controller.js';
import * as products from '../controllers/product.controller.js';
import * as promotions from '../controllers/promotion.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as seo from '../controllers/seo.controller.js';

/**
 * Catálogo público: Vercel guarda la respuesta 1 minuto en su red (s-maxage) y la sigue sirviendo
 * mientras la renueva en segundo plano (stale-while-revalidate). El navegador no la guarda (max-age=0),
 * así los cambios del admin se ven en la tienda en ~1 minuto. El carrito (POST) nunca se guarda.
 */
// Se aplica ruta por ruta: este router recibe todas las requests (también /admin y /orders), que nunca se guardan
const publicCache = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  next();
};

router.get('/settings/public', publicCache, settings.publicSettings);
router.get('/sitemap.xml', publicCache, seo.sitemap);

router.get('/categories', publicCache, categories.publicList);
router.get('/suppliers', publicCache, suppliers.publicList);

router.get('/products', publicCache, products.publicList);
router.get('/products/featured', publicCache, products.featured);
router.get('/products/:slug', publicCache, products.bySlug);

router.get('/promotions', publicCache, promotions.publicList);
router.get('/promotions/:id', publicCache, validate([idParam()]), promotions.publicOne);

router.post('/cart/validate', validate(cartItems), orders.validateCart);

export default router;
