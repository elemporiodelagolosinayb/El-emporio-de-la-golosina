import express from 'express';
import publicRoutes from './public.routes.js';
import customerAuthRoutes from './customerAuth.routes.js';
import ordersRoutes from './orders.routes.js';
import adminRoutes from './admin.routes.js';

const router = express.Router();

router.use('/', publicRoutes);
router.use('/auth', customerAuthRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin', adminRoutes);

export default router;
