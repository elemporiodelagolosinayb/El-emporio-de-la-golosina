import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../store/useSettingsStore';
import { scheduleSummary } from '../../utils/schedule';
import { waLink, waGeneralMessage } from '../../utils/whatsapp';
import Icon from '../ui/Icon';
import Logo from './Logo';
import OpenIndicator from './OpenIndicator';

/** Franja superior: logo circular + texto editable + (desktop) horario y redes. Abajo, el toldo a rayas. */
export default function TopBar() {
  const s = useSettingsStore((st) => st.settings);
  const summary = scheduleSummary(s.schedule) || s.scheduleText;

  return (
    <div className="relative z-50 bg-petrol-dark text-white">
      <div className="container-page flex h-11 items-center gap-2.5">
        <Link to="/" className="shrink-0" aria-label="Inicio">
          <Logo variant="topbar" className="h-8 w-8 rounded-full bg-white object-cover ring-2 ring-white/70" />
        </Link>
        <p className="truncate text-[13px] font-bold tracking-wide sm:text-sm">{s.topbarText}</p>

        <div className="ml-auto hidden items-center gap-3 text-[13px] md:flex">
          <OpenIndicator />
          {summary && (
            <span className="flex items-center gap-1.5 text-white/85">
              <Icon name="clock" className="h-4 w-4" />
              {summary}
            </span>
          )}
          <span className="h-4 w-px bg-white/25" />
          {s.facebook && (
            <a href={s.facebook} target="_blank" rel="noreferrer" className="rounded-full p-1 text-white/90 hover:bg-white/10 hover:text-white" aria-label="Facebook">
              <Icon name="facebook" className="h-[18px] w-[18px]" />
            </a>
          )}
          {s.instagram && (
            <a href={s.instagram} target="_blank" rel="noreferrer" className="rounded-full p-1 text-white/90 hover:bg-white/10 hover:text-white" aria-label="Instagram">
              <Icon name="instagram" className="h-[18px] w-[18px]" />
            </a>
          )}
          <a href={waLink(s.whatsapp, waGeneralMessage())} target="_blank" rel="noreferrer" className="rounded-full p-1 text-white/90 hover:bg-white/10 hover:text-white" aria-label="WhatsApp">
            <Icon name="whatsapp" className="h-[18px] w-[18px]" />
          </a>
        </div>
      </div>
      <div className="awning-wrap pointer-events-none absolute inset-x-0 top-full" aria-hidden="true">
        <div className="awning" />
      </div>
    </div>
  );
}
