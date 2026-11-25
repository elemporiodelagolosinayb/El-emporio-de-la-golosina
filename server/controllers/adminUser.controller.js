import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const items = await Admin.find().sort({ createdAt: 1 }).lean();
  res.json({ ok: true, items });
});

export const create = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const item = await Admin.create({ name, email, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ ok: true, item: { _id: item._id, name: item.name, email: item.email } });
});

export const update = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const update = { name, email };
  if (password) update.password = await bcrypt.hash(password, 12);
  const item = await Admin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!item) throw ApiError.notFound('Administrador no encontrado');
  res.json({ ok: true, item });
});

/** No se puede eliminar a uno mismo ni al último admin */
export const remove = asyncHandler(async (req, res) => {
  if (String(req.admin._id) === String(req.params.id)) throw ApiError.badRequest('No podés eliminar tu propio usuario');
  if ((await Admin.countDocuments()) <= 1) throw ApiError.badRequest('Tiene que quedar al menos un administrador');
  const item = await Admin.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('Administrador no encontrado');
  res.json({ ok: true });
});
