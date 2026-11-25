import { body } from 'express-validator';
import { ORDER_STATUSES } from '../models/Order.js';
import { fullNameRule, phoneRule } from './common.js';

const cartItems = [
  body('items').isArray({ min: 1, max: 300 }).withMessage('El carrito está vacío'),
  body('items.*.type').isIn(['product', 'promotion']).withMessage('Hay un producto del carrito que ya no existe. Revisá tu carrito.'),
  body('items.*.id').isMongoId().withMessage('Hay un producto del carrito que ya no existe. Revisá tu carrito.'),
  body('items.*.quantity').isInt({ min: 1, max: 100000 }).withMessage('Cantidad inválida').toInt(),
];

/** Siempre se guarda quién compra: nombre completo y celular obligatorios */
const createOrder = [
  ...cartItems,
  fullNameRule('name'),
  phoneRule('phone'),
  body('notes').optional().trim().isLength({ max: 300 }).withMessage('Las observaciones no pueden superar 300 caracteres'),
];

const updateStatus = [body('status').isIn(ORDER_STATUSES).withMessage('Estado inválido')];
const updateNotes = [body('internalNotes').optional().trim().isLength({ max: 1000 })];

export { cartItems, createOrder, updateStatus, updateNotes };
