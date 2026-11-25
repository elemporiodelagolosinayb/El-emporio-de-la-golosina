/** Error con código HTTP y errores por campo opcionales */
class ApiError extends Error {
  constructor(status, message, errors = [], extra = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.extra = extra;
  }

  static badRequest(msg, errors, extra) {
    return new ApiError(400, msg, errors, extra);
  }
  static unauthorized(msg = 'No autorizado') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'No tenés permisos para esta acción') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'No encontrado') {
    return new ApiError(404, msg);
  }
  static conflict(msg, errors, extra) {
    return new ApiError(409, msg, errors, extra);
  }
}

export default ApiError;
