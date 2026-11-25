import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signAdminToken } from '../middlewares/auth.js';

const publicAdmin = (a) => ({ id: a._id, name: a.name, email: a.email });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');
  const valid = admin && (await bcrypt.compare(password, admin.password));
  if (!valid) throw ApiError.unauthorized('Correo o contraseña incorrectos');
  res.json({ ok: true, token: signAdminToken(admin), admin: publicAdmin(admin) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, admin: publicAdmin(req.admin) });
});
