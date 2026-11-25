import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatPrice } from '../../utils/format';
import { cld } from '../../utils/cloudinary';
import { waLink } from '../../utils/whatsapp';
import Icon from '../ui/Icon';

const TZ = 'America/Argentina/Buenos_Aires';
const dm = (d) => new Date(d).toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'numeric' });

/** "Del 2/11 al 16/11" */
export const promoRange = (p) => `Del ${dm(p.startDate)} al ${dm(p.endDate)}`;

/** A qué se aplica, en texto: "En Alfajores" / "Incluye: ..." / "En toda la tienda" */
export function promoScopeText(p) {
  if (p.scope === 'categories' && p.categories?.length) return `En ${p.categories.map((c) => c.name).join(', ')}`;
  if (p.scope === 'products' && p.products?.length) return `Incluye: ${p.products.map((x) => x.name).join(' · ')}`;
  return 'En toda la tienda';
}

/** Precio del cartel (opcional) con el normal tachado */
export function PromoPrice({ promo, size = 'md' }) {
  if (!(promo.price > 0)) return null;
  const big = size === 'lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-black text-bubblegum ${big ? 'text-4xl' : 'text-3xl'}`}>{formatPrice(promo.price)}</span>
      {promo.regularPrice > promo.price && <span className="font-bold text-gray-400 line-through">{formatPrice(promo.regularPrice)}</span>}
    </div>
  );
}

/**
 * Tarjeta de promoción con formato de CUPÓN: foto a un lado, borde troquelado con muescas
 * y calcomanía dorada con el % de descuento. "Ver productos" lleva al catálogo filtrado.
 */
export default function PromoCard({ promo }) {
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-20px_rgba(206,84,135,0.5)] sm:flex-row"
    >
      {/* Imagen */}
      <Link to={`/catalogo?promo=${promo._id}`} className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-gradient-to-br from-bubblegum via-bubblegum-light to-candy-gold sm:aspect-auto sm:w-[42%]">
        {promo.image?.url ? (
          <img src={cld(promo.image.url, 600)} alt={promo.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="sparkles grid h-full min-h-[150px] place-items-center text-6xl" aria-hidden="true">🍭</div>
        )}
        {promo.occasionLabel && <span className="badge absolute left-3 top-3 bg-white px-3 py-1 text-petrol shadow">{promo.occasionLabel}</span>}
      </Link>

      {/* Troquel: línea punteada con muescas */}
      <div className="relative shrink-0 border-t-2 border-dashed border-petrol/15 sm:border-l-2 sm:border-t-0" aria-hidden="true">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-cream sm:-left-3 sm:-top-3" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-cream sm:-bottom-3 sm:-left-3 sm:right-auto sm:top-auto" />
      </div>

      {/* Contenido */}
      <div className="relative flex flex-1 flex-col p-5">
        <span className="absolute -top-7 right-4 grid h-16 w-16 rotate-12 place-items-center rounded-full bg-candy-gold text-center font-display font-bold leading-none text-ink shadow-lg ring-4 ring-white sm:-top-2 sm:right-3">
          <span>
            <span className="block text-lg">-{promo.discountPercent}%</span>
            <span className="block text-[10px] tracking-wider">OFF</span>
          </span>
        </span>

        <h3 className="pr-16 text-xl leading-tight text-petrol-dark">{promo.title}</h3>
        {promo.description && <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-sm text-gray-600 sm:pr-12">{promo.description}</p>}
        <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-sky">{promoScopeText(promo)}</p>

        <div className="mt-auto pt-3">
          <PromoPrice promo={promo} />
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Icon name="clock" className="h-3.5 w-3.5" /> {promoRange(promo)}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to={`/catalogo?promo=${promo._id}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-petrol px-4 text-sm font-extrabold text-white transition hover:bg-petrol-dark">
              Ver productos <Icon name="chevronRight" className="h-4 w-4" />
            </Link>
            <a
              href={waLink(whatsapp, `¡Hola! Quería consultar por la promo "${promo.title}".`)}
              target="_blank"
              rel="noreferrer"
              aria-label="Consultar por WhatsApp"
              title="Consultar por WhatsApp"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint/30 text-petrol-dark transition hover:bg-petrol hover:text-white"
            >
              <Icon name="whatsapp" className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
