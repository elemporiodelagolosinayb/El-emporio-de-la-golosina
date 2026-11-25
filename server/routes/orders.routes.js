import express from 'express';
const router = express.Router();
import validate from '../middlewares/validate.js';
import { requireCustomer } from '../middlewares/auth.js';
import * as v from '../validators/order.validator.js';
import * as ctrl from '../controllers/order.controller.js';

router.use(requireCustomer);
router.post('/', validate(v.createOrder), ctrl.create);
router.get('/mine', ctrl.mine);
router.get('/mine/:orderNumber', ctrl.mineOne);
router.post('/mine/:orderNumber/receipt-sent', ctrl.receiptSent);

export default router;
