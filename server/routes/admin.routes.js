import express from 'express';
const router = express.Router();
import validate from '../middlewares/validate.js';
import { requireAdmin } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimits.js';
import { uploadExcel } from '../middlewares/upload.js';
import { idParam } from '../validators/common.js';
import * as authV from '../validators/auth.validator.js';
import * as catalogV from '../validators/catalog.validator.js';
import * as orderV from '../validators/order.validator.js';
import * as adminV from '../validators/admin.validator.js';

import * as auth from '../controllers/adminAuth.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import categories from '../controllers/category.controller.js';
import suppliers from '../controllers/supplier.controller.js';
import * as products from '../controllers/product.controller.js';
import * as importer from '../controllers/import.controller.js';
import * as promotions from '../controllers/promotion.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as customers from '../controllers/customer.controller.js';
import * as users from '../controllers/adminUser.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as cloud from '../controllers/cloudinary.controller.js';

const id = validate([idParam()]);

// ---------- Auth (pública) ----------
router.post('/auth/login', authLimiter, validate(authV.adminLogin), auth.login);

// ---------- Todo lo demás requiere admin ----------
router.use(requireAdmin);
router.get('/auth/me', auth.me);
router.get('/dashboard', dashboard.summary);

// Cloudinary: firma para subida directa desde el front
router.post('/cloudinary/signature', cloud.signature);

// Categorías
router.get('/categories', categories.list);
router.post('/categories', validate(catalogV.category), categories.create);
router.put('/categories/reorder', categories.reorder);
router.put('/categories/:id', id, validate(catalogV.category), categories.update);
router.patch('/categories/:id/toggle', id, categories.toggle);
router.delete('/categories/:id', id, categories.remove);

// Proveedores
router.get('/suppliers', suppliers.list);
router.post('/suppliers', validate(catalogV.supplier), suppliers.create);
router.put('/suppliers/reorder', suppliers.reorder);
router.put('/suppliers/:id', id, validate(catalogV.supplier), suppliers.update);
router.patch('/suppliers/:id/toggle', id, suppliers.toggle);
router.delete('/suppliers/:id', id, suppliers.remove);

// Productos
router.get('/products', products.adminList);
router.get('/products/lookup', products.lookup);
router.get('/products/export', products.exportAll);
router.post('/products/bulk', validate(catalogV.productBulk), products.bulk);
router.patch('/products/review/bulk', validate(catalogV.productReviewBulk), products.setReviewBulk);
router.post('/products/images', products.setImages);
router.post('/products/import/preview', uploadExcel, importer.preview);
router.post('/products/import/apply', uploadExcel, importer.apply);
router.post('/products/import/create-missing', importer.createMissing);
router.post('/products', validate(catalogV.product), products.create);
router.get('/products/:id', id, products.getOne);
router.put('/products/:id', id, validate(catalogV.product), products.update);
router.patch('/products/:id', id, validate(catalogV.productQuick), products.quickUpdate);
router.patch('/products/:id/review', id, validate(catalogV.productReview), products.setReview);
router.delete('/products/:id/image', id, products.removeImage);
router.delete('/products/:id', id, products.remove);

// Promociones
router.get('/promotions', promotions.adminList);
router.post('/promotions', validate(catalogV.promotion), promotions.create);
router.get('/promotions/:id', id, promotions.getOne);
router.put('/promotions/:id', id, validate(catalogV.promotion), promotions.update);
router.patch('/promotions/:id/toggle', id, promotions.toggle);
router.post('/promotions/:id/duplicate', id, promotions.duplicate);
router.delete('/promotions/:id', id, promotions.remove);

// Pedidos
router.get('/orders', orders.adminList);
router.get('/orders/:id', id, orders.adminOne);
router.patch('/orders/:id/verify', id, orders.verifyPayment);
router.patch('/orders/:id/status', id, validate(orderV.updateStatus), orders.updateStatus);
router.patch('/orders/:id/notes', id, validate(orderV.updateNotes), orders.updateNotes);
router.delete('/orders/:id', id, orders.remove);

// Clientes
router.get('/customers', customers.list);
router.put('/customers/:id', id, validate(adminV.customerUpdate), customers.update);
router.post('/customers/:id/reset-pin', id, customers.resetPin);
router.delete('/customers/:id', id, customers.remove);

// Usuarios admin
router.get('/users', users.list);
router.post('/users', validate(adminV.adminCreate), users.create);
router.put('/users/:id', id, validate(adminV.adminUpdate), users.update);
router.delete('/users/:id', id, users.remove);

// Configuración
router.get('/settings', settings.get);
router.put('/settings', validate(adminV.settings), settings.update);
router.put('/settings/logo/:type', settings.setLogo);
router.delete('/settings/logo/:type', settings.removeLogo);

export default router;
