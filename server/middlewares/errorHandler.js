import ApiError from '../utils/ApiError.js';

function notFound(req, res, next) {
  next(ApiError.notFound('No encontramos lo que buscabas'));
}

/** Middleware central: siempre responde { ok: false, message, errors: [{ field, msg }] } */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.';
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : [];
  const extra = err.extra || {};

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    status = 400;
    // Los mensajes propios de Mongoose ("Path `x` is required", "Cast to…") no se muestran tal cual
    const plain = (m) => (/Path `|Cast to|validator failed|is required/i.test(m) ? 'Revisá este dato' : m);
    errors = Object.values(err.errors).map((e) => ({ field: e.path, msg: plain(e.message) }));
    message = errors[0]?.msg === 'Revisá este dato' ? 'Hay datos sin completar o inválidos. Revisalos y probá de nuevo.' : errors[0]?.msg || 'Revisá los datos y probá de nuevo.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Hay un dato inválido. Revisalo y probá de nuevo.';
    errors = [{ field: err.path, msg: message }];
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'campo';
    const labels = { code: 'código', phone: 'celular', email: 'email', slug: 'nombre', normalizedName: 'nombre' };
    message = `Ya existe un registro con ese ${labels[field] || field}`;
    errors = [{ field: field === 'normalizedName' ? 'name' : field, msg: message }];
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es muy pesado (máximo 4 MB)' : 'No pudimos recibir el archivo. Probá de nuevo.';
    errors = [{ field: 'file', msg: message }];
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Lo que enviaste es demasiado grande. Probá con menos datos o un archivo más liviano.';
  }

  // Errores inesperados: el detalle queda en el log del servidor, al usuario se le muestra algo claro
  if (status >= 500) {
    console.error('[ERROR]', err);
    message = 'Algo salió mal de nuestro lado. Probá de nuevo en unos minutos.';
    errors = [];
  }

  res.status(status).json({ ok: false, message, errors, ...extra });
}

export { notFound, errorHandler, ApiError };
