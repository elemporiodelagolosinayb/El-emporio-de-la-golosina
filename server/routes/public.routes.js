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

router.get('/settings/public', settings.publicSettings);

router.get('/categories', categories.publicList);
router.get('/suppliers', suppliers.publicList);

router.get('/products', products.publicList);
router.get('/products/featured', products.featured);
router.get('/products/:slug', products.bySlug);

router.get('/promotions', promotions.publicList);
router.get('/promotions/:id', validate([idParam()]), promotions.publicOne);

router.post('/cart/validate', validate(cartItems), orders.validateCart);

export default router;
