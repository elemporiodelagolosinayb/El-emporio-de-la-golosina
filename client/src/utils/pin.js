/** Mismo criterio que server/utils/pin.js */
const COMMON_PINS = ['1212', '2580', '6969', '1004', '2000', '1122', '1010', '0852'];

export function isTrivialPin(pin) {
  const p = String(pin);
  if (!/^\d{4}$/.test(p)) return true;
  if (/^(\d)\1{3}$/.test(p)) return true;
  const d = p.split('').map(Number);
  const asc = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const desc = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  if (asc || desc) return true;
  return COMMON_PINS.includes(p);
}
