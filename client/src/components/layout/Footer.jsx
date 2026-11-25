import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCatalogStore } from '../../store/useCatalogStore';
import { formatPhone } from '../../utils/phone';
import { waLink, waGeneralMessage } from '../../utils/whatsapp';
import Icon from '../ui/Icon';
import Logo from './Logo';
import OpenIndicator from './OpenIndicator';

const igHandle = (url) => {
  const m = String(url || '').match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : 'Instagram';
};

/** Íconos redondos de redes (blancos, como en la referencia) */
function SocialIcons({ s, className = '' }) {
  const links = [
    s.instagram && ['instagram', s.instagram, 'Instagram'],
    s.facebook && ['facebook', s.facebook, 'Facebook'],
    s.tiktok && ['tiktok', s.tiktok, 'TikTok'],
    ['whatsapp', waLink(s.whatsapp, waGeneralMessage()), 'WhatsApp'],
  ].filter(Boolean);
  return (
    <div className={`flex gap-3 ${className}`}>
      {links.map(([icon, href, label]) => (
        <a key={icon} href={href} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white text-petrol transition hover:scale-110" aria-label={label}>
          <Icon name={icon} className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

/** Footer: logo principal + contacto (todo editable desde el admin) */
export default function Footer() {
  const s = useSettingsStore((st) => st.settings);
  const categories = useCatalogStore((st) => st.categories);
  const year = new Date().getFullYear();
  const description = 'Distribuidora mayorista de golosinas en Yerba Buena.';

  return (
    <footer className="mt-20 bg-petrol pb-[calc(6rem+env(safe-area-inset-bottom))] text-white md:pb-0">
      {/* ===== Celular: compacto y centrado (como en la referencia) ===== */}
      <div className="container-page flex flex-col items-center py-12 text-center md:hidden">
        <Link to="/" className="inline-flex" aria-label="Inicio">
          <Logo variant="main" light className="h-16 w-auto max-w-[240px] text-2xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
        </Link>
        <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/90">{description}</p>
        {s.address && (
          <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-sm text-white/85 underline-offset-2 hover:underline">
            <Icon name="pin" className="h-4 w-4" /> {s.address}
          </a>
        )}
        <SocialIcons s={s} className="mt-5 justify-center" />
      </div>

      {/* ===== Computadora: columnas ===== */}
      <div className="container-page hidden gap-10 py-12 md:grid md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <div className="inline-flex">
            <Logo variant="main" light className="h-16 w-auto max-w-[240px] text-2xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
          </div>
          <p className="mt-4 max-w-xs text-white/85">{description}</p>
          <SocialIcons s={s} className="mt-4" />
        </div>

        <div>
          <h3 className="mb-3 text-lg text-white">Tienda</h3>
          <ul className="space-y-2 text-white/85">
            <li><Link to="/catalogo" className="hover:text-white hover:underline">Catálogo completo</Link></li>
            <li><Link to="/promociones" className="hover:text-white hover:underline">Promociones</Link></li>
            <li><Link to="/mis-pedidos" className="hover:text-white hover:underline">Mis pedidos</Link></li>
            <li><Link to="/ingresar" className="hover:text-white hover:underline">Mi cuenta</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-lg text-white">Categorías</h3>
          <ul className="grid grid-cols-1 gap-2 text-white/85">
            {categories.slice(0, 7).map((c) => (
              <li key={c._id}>
                <Link to={`/catalogo/${c.slug}`} className="hover:text-white hover:underline">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-lg text-white">Contacto</h3>
          <ul className="space-y-3 text-white/90">
            {s.address && (
              <li>
                <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 hover:underline">
                  <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-bubblegum-light" />
                  <span>{s.address}</span>
                </a>
              </li>
            )}
            {s.scheduleText && (
              <li className="flex items-start gap-2.5">
                <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-bubblegum-light" />
                <span>
                  {s.scheduleText}
                  <OpenIndicator className="ml-0 mt-1.5 flex w-fit" />
                </span>
              </li>
            )}
            <li>
              <a href={waLink(s.whatsapp, waGeneralMessage())} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 hover:underline">
                <Icon name="whatsapp" className="mt-0.5 h-5 w-5 shrink-0 text-bubblegum-light" />
                <span>{formatPhone(s.whatsapp)}</span>
              </a>
            </li>
            {s.instagram && (
              <li>
                <a href={s.instagram} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 hover:underline">
                  <Icon name="instagram" className="mt-0.5 h-5 w-5 shrink-0 text-bubblegum-light" />
                  <span>{igHandle(s.instagram)}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="container-page">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/15 py-5 text-center text-sm text-white/80 sm:pr-24">
          <span>© {year} El Emporio de la Golosina — Yerba Buena, Tucumán</span>
        </div>
      </div>
    </footer>
  );
}
