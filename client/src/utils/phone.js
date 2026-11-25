/**
 * normalizePhone — MISMO criterio que server/utils/phone.js
 * Devuelve el celular en formato 549XXXXXXXXXX o null si no es válido.
 */
export function normalizePhone(input) {
  if (input === undefined || input === null) return null;
  let d = String(input).replace(/\D/g, '');
  if (!d) return null;

  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9') && d.length >= 11) d = d.slice(1);
  }
  if (d.startsWith('0')) d = d.slice(1);

  if (d.length === 12) {
    for (const areaLen of [3, 2, 4]) {
      if (d.substr(areaLen, 2) === '15') {
        d = d.slice(0, areaLen) + d.slice(areaLen + 2);
        break;
      }
    }
  }

  if (d.length !== 10) return null;
  return `549${d}`;
}

/** 5493813495928 → +54 9 381 349-5928 */
export function formatPhone(phone) {
  if (!phone || phone.length !== 13) return phone || '';
  const local = phone.slice(3);
  return `+54 9 ${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`;
}
