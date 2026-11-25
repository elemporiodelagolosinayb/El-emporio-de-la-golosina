import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { isOpenNow } from '../../utils/schedule';

/** "Abierto ahora / Cerrado" según el horario configurado y la hora de Argentina */
export default function OpenIndicator({ className = '' }) {
  const schedule = useSettingsStore((s) => s.settings.schedule);
  const [open, setOpen] = useState(() => isOpenNow(schedule));

  useEffect(() => {
    setOpen(isOpenNow(schedule));
    const t = setInterval(() => setOpen(isOpenNow(schedule)), 60000);
    return () => clearInterval(t);
  }, [schedule]);

  if (open === null) return null;
  return (
    <span className={`badge ${open ? 'bg-mint text-petrol-dark' : 'bg-white/15 text-white'} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-petrol-dark animate-pulse' : 'bg-white/60'}`} />
      {open ? 'Abierto ahora' : 'Cerrado'}
    </span>
  );
}
