/**
 * Fechas en zona horaria America/Argentina/Buenos_Aires.
 * Argentina no usa horario de verano desde 2009: offset fijo -03:00.
 */
const TZ = 'America/Argentina/Buenos_Aires';
const AR_OFFSET = '-03:00';

/** Recibe "YYYY-MM-DD" (o Date) y devuelve el inicio de ese día en hora argentina */
function startOfDayAR(value) {
  const ymd = toYMD(value);
  return new Date(`${ymd}T00:00:00.000${AR_OFFSET}`);
}

/** Fin del día (23:59:59.999) en hora argentina */
function endOfDayAR(value) {
  const ymd = toYMD(value);
  return new Date(`${ymd}T23:59:59.999${AR_OFFSET}`);
}

/** Convierte un Date o string a "YYYY-MM-DD" según el calendario argentino */
function toYMD(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** "16/11/2026 19:40" en hora argentina */
function formatDateTimeAR(date) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

/** "2026-11-16T09:30" (datetime-local, hora AR) → Date. Acepta también "YYYY-MM-DD" o ISO. */
function parseARDateTime(value, { endOfDay = false } = {}) {
  const v = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return new Date(`${v}:00${AR_OFFSET}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return endOfDay ? endOfDayAR(v) : startOfDayAR(v);
  return new Date(v);
}

/** Date → "YYYY-MM-DDTHH:mm" en hora AR (para inputs datetime-local) */
function toLocalInputAR(date) {
  const d = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/** Filtro Mongo de promociones vigentes ahora */
function activePromotionFilter(now = new Date()) {
  return { active: true, startDate: { $lte: now }, endDate: { $gte: now } };
}

/** Estado de una promo: programada / vigente / vencida / inactiva */
function promotionStatus(promo, now = new Date()) {
  if (!promo.active) return 'pausada';
  if (now < new Date(promo.startDate)) return 'programada';
  if (now > new Date(promo.endDate)) return 'terminada';
  return 'vigente';
}

export {
  TZ,
  startOfDayAR,
  endOfDayAR,
  toYMD,
  formatDateTimeAR,
  activePromotionFilter,
  promotionStatus,
  parseARDateTime,
  toLocalInputAR,
};
