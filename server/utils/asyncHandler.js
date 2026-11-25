/** Envuelve controllers async para mandar los errores al middleware central */
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
