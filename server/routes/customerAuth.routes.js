import express from 'express';
const router = express.Router();
import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimits.js';
import { requireCustomer } from '../middlewares/auth.js';
import * as v from '../validators/auth.validator.js';
import * as ctrl from '../controllers/customerAuth.controller.js';

router.post('/check-phone', authLimiter, validate(v.checkPhone), ctrl.checkPhone);
router.post('/register', authLimiter, validate(v.customerRegister), ctrl.register);
router.post('/login', authLimiter, validate(v.customerLogin), ctrl.login);
router.get('/me', requireCustomer, ctrl.me);

export default router;
