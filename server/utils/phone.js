/**
 * normalizePhone — MISMO criterio que client/src/utils/phone.js
 * Devuelve el celular argentino en formato 549XXXXXXXXXX (13 dígitos) o null si no es válido.
 *
 * Acepta: "381 1234567", "0381 15 1234567", "+54 9 381 1234567", "54 381 15 1234567",
 *         "(0381) 15-123-4567", "5493811234567", "0054 9 381...", etc.
 */
function normalizePhone(input) {
  if (input === undefined || input === null) return null;
  let d = String(input).replace(/\D/g, '');
  if (!d) return null;

  if (d.startsWith('00')) d = d.slice(2); // prefijo internacional 00
  if (d.startsWith('54')) {
    d = d.slice(2); // código de país
    if (d.startsWith('9') && d.length >= 11) d = d.slice(1); // el 9 de celulares
  }
  if (d.startsWith('0')) d = d.slice(1); // 0 de larga distancia

  // Quitar el "15" que va después de la característica (2, 3 o 4 dígitos)
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

/** Formato lindo para mostrar: +54 9 381 349-5928 (aproximado, asume característica de 3 dígitos) */
function formatPhone(phone) {
  if (!phone || phone.length !== 13) return phone || '';
  const local = phone.slice(3);
  return `+54 9 ${local.slice(0, 3)} ${local.slice(3, 6)}-${local.slice(6)}`;
}

export { normalizePhone, formatPhone };
