import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import Admin from '../models/Admin.js';
import Customer from '../models/Customer.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Protege rutas del panel: token firmado con JWT_SECRET_ADMIN y rol admin */
async function requireAdmin(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) throw ApiError.unauthorized('Iniciá sesión como administrador');
    const payload = jwt.verify(token, env.JWT_SECRET_ADMIN);
    if (payload.role !== 'admin') throw ApiError.forbidden();
    const admin = await Admin.findById(payload.id);
    if (!admin) throw ApiError.unauthorized('Tu sesión terminó. Volvé a ingresar.');
    req.admin = admin;
    next();
  } catch (err) {
    next(err.name?.includes('Token') ? ApiError.unauthorized('Tu sesión venció. Volvé a ingresar.') : err);
  }
}

/** Protege rutas de cliente: token firmado con JWT_SECRET_CUSTOMER y rol customer */
async function requireCustomer(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) throw ApiError.unauthorized('Ingresá con tu celular para continuar');
    const payload = jwt.verify(token, env.JWT_SECRET_CUSTOMER);
    if (payload.role !== 'customer') throw ApiError.forbidden();
    const customer = await Customer.findById(payload.id);
    if (!customer) throw ApiError.unauthorized('Tu sesión terminó. Volvé a ingresar.');
    req.customer = customer;
    next();
  } catch (err) {
    next(err.name?.includes('Token') ? ApiError.unauthorized('Tu sesión venció. Volvé a ingresar.') : err);
  }
}

function signAdminToken(admin) {
  return jwt.sign({ id: admin._id, role: 'admin' }, env.JWT_SECRET_ADMIN, { expiresIn: '12h' });
}

function signCustomerToken(customer) {
  return jwt.sign({ id: customer._id, role: 'customer' }, env.JWT_SECRET_CUSTOMER, {
    expiresIn: '30d',
  });
}

export { requireAdmin, requireCustomer, signAdminToken, signCustomerToken };
