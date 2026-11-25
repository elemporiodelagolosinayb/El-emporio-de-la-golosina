import { body } from 'express-validator';
import { phoneRule, pinRule, newPinRules, customerNameRule } from './common.js';

const checkPhone = [phoneRule()];
const customerLogin = [phoneRule(), pinRule()];
const customerRegister = [phoneRule(), customerNameRule(), ...newPinRules()];

const adminLogin = [
  body('email').trim().isEmail().withMessage('Correo electrónico inválido').toLowerCase(),
  body('password').isString().notEmpty().withMessage('Ingresá la contraseña'),
];

export { checkPhone, customerLogin, customerRegister, adminLogin };
