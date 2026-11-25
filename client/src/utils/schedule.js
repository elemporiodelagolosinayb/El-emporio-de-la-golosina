const TZ = 'America/Argentina/Buenos_Aires';
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Día (0-6) y "HH:MM" actuales en hora argentina */
function nowAR() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { day, time: `${hour}:${get('minute')}` };
}

/** ¿Está abierto ahora según el horario configurado? */
export function isOpenNow(schedule = []) {
  if (!schedule?.length) return null;
  const { day, time } = nowAR();
  const today = schedule.find((d) => d.day === day);
  if (!today || today.closed) return false;
  return today.ranges.some((r) => time >= r.open && time < r.close);
}

/** "08:30" → "8:30", "13:00" → "13" */
const short = (t) => {
  const [h, m] = t.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}:${m}`;
};

/** Resumen corto del horario agrupando días consecutivos iguales: "Lun a Sáb 8:30–13 y 17–21 h" */
export function scheduleSummary(schedule = []) {
  if (!schedule?.length) return '';
  const order = [1, 2, 3, 4, 5, 6, 0];
  const abbr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const key = (d) => (d.closed || !d.ranges.length ? 'closed' : d.ranges.map((r) => `${r.open}-${r.close}`).join(','));
  const groups = [];
  order.forEach((dayNum) => {
    const d = schedule.find((x) => x.day === dayNum);
    if (!d) return;
    const k = key(d);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.days.push(dayNum);
    else groups.push({ key: k, days: [dayNum], ranges: d.ranges });
  });
  return groups
    .filter((g) => g.key !== 'closed')
    .map((g) => {
      const days = g.days.length > 1 ? `${abbr[g.days[0]]} a ${abbr[g.days[g.days.length - 1]]}` : abbr[g.days[0]];
      return `${days} ${g.ranges.map((r) => `${short(r.open)}–${short(r.close)}`).join(' y ')} h`;
    })
    .join(' · ');
}
