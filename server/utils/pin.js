import crypto from 'crypto';

/** Reglas de PIN (mismo criterio que client/src/utils/pin.js) */
const COMMON_PINS = ['1212', '2580', '6969', '1004', '2000', '1122', '1010', '0852'];

function isTrivialPin(pin) {
  const p = String(pin);
  if (!/^\d{4}$/.test(p)) return true;
  if (/^(\d)\1{3}$/.test(p)) return true; // 0000, 1111...
  const digits = p.split('').map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1); // 1234, 2345...
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1); // 4321, 9876...
  if (asc || desc) return true;
  return COMMON_PINS.includes(p);
}

/** Genera un PIN aleatorio de 4 dígitos que no sea trivial (para reseteo desde el admin) */
function generatePin() {
  let pin;
  do {
    pin = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  } while (isTrivialPin(pin));
  return pin;
}

export { isTrivialPin, generatePin };
