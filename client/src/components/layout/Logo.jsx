import { useSettingsStore } from '../../store/useSettingsStore';
import { cld } from '../../utils/cloudinary';

/**
 * Logo leído de Settings. Si no hay logo cargado, muestra el nombre en texto.
 * variant: 'main' (horizontal: navbar/footer) | 'topbar' (circular)
 * Se recorta el borde sobrante con Cloudinary (e_trim) para que el logo ocupe todo el alto.
 */
export default function Logo({ variant = 'main', className = '', light = false }) {
  const settings = useSettingsStore((s) => s.settings);
  const logo = variant === 'topbar' ? settings.logoTopbar : settings.logoMain;

  if (logo?.url) {
    return <img src={cld(logo.url, variant === 'topbar' ? 200 : 600, { trim: variant === 'main' })} alt={settings.businessName} className={`object-contain ${className}`} />;
  }
  if (variant === 'topbar') {
    return (
      <span className={`grid place-items-center rounded-full border-2 border-white bg-sky text-lg text-white ${className}`} aria-label={settings.businessName}>
        🍬
      </span>
    );
  }
  return (
    <span className={`font-display font-bold leading-none ${light ? 'text-white' : 'text-petrol'} ${className}`}>
      <span className="block text-[0.5em] tracking-[0.25em] opacity-80">EL EMPORIO</span>
      <span className="block">de la Golosina</span>
    </span>
  );
}
