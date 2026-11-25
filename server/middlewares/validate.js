import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/** Ejecuta las reglas de express-validator y responde con { field, msg } */
export default (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const seen = new Set();
    const errors = result
      .array()
      .map((e) => ({ field: e.path, msg: e.msg }))
      .filter((e) => (seen.has(e.field) ? false : seen.add(e.field)));
    next(ApiError.badRequest(errors[0]?.msg || 'Datos inválidos', errors));
  },
];
