import multer from 'multer';
import path from 'path';
import ApiError from '../utils/ApiError.js';

const EXCEL_EXT = ['.xlsx', '.xls', '.csv'];

/** Multer en memoria SOLO para el Excel (las imágenes van directo a Cloudinary desde el front) */
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!EXCEL_EXT.includes(ext)) {
      return cb(ApiError.badRequest('Solo se aceptan archivos .xlsx, .xls o .csv', [{ field: 'file', msg: 'Formato inválido' }]));
    }
    cb(null, true);
  },
}).single('file');

export { uploadExcel };
