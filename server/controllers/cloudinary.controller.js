import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { signUpload, ALLOWED_FOLDERS } from '../services/cloudinary.service.js';

/** POST /api/admin/cloudinary/signature  body: { folder } */
export const signature = asyncHandler(async (req, res) => {
  const folder = req.body.folder || 'emporio/productos';
  if (!ALLOWED_FOLDERS.includes(folder)) throw ApiError.badRequest('No se pudo subir la imagen. Probá de nuevo.');
  res.json({ ok: true, ...signUpload(folder) });
});
