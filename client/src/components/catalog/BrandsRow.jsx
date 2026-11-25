import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cld } from '../../utils/cloudinary';
import Icon from '../ui/Icon';

// Colores de la marca para los nombres de los proveedores que todavía no tienen logo
const NAME_COLORS = ['text-bubblegum', 'text-petrol', 'text-sky', 'text-petrol-dark'];
const MIN_PER_ROW = 10; // si hay pocas marcas se repiten para que la franja no quede con huecos

/** Reparte las marcas en dos franjas (alternadas) y repite cada una hasta llenar el ancho */
function splitRows(suppliers) {
  const rows = [suppliers.filter((_, i) => i % 2 === 0), suppliers.filter((_, i) => i % 2 === 1)].filter((r) => r.length);
  if (rows.length === 1) rows.push([...rows[0]].reverse());
  return rows.map((row) => {
    let filled = row;
    while (filled.length < MIN_PER_ROW) filled = [...filled, ...row];
    return filled;
  });
}

function BrandCard({ s, index, copy = false }) {
  return (
    <motion.div whileTap={{ scale: 1.14 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className="shrink-0">
      <Link
        to={`/catalogo?proveedor=${s.slug}`}
        tabIndex={copy ? -1 : undefined}
        title={`Ver productos ${s.name}`}
        className="group relative flex h-20 w-40 items-center justify-center px-3 outline-none transition duration-300 hover:z-10 hover:scale-[1.15] focus-visible:scale-[1.15] md:h-24 md:w-48"
      >
        {s.logo?.url ? (
          <img src={cld(s.logo.url, 260, { trim: true })} alt={s.name} loading="lazy" draggable="false" className="max-h-12 w-auto max-w-full object-contain drop-shadow-[0_6px_10px_rgba(30,79,97,0.18)] md:max-h-16" />
        ) : (
          <span className={`text-center font-display text-lg font-bold leading-tight md:text-xl ${NAME_COLORS[index % NAME_COLORS.length]}`}>{s.name}</span>
        )}
        <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bubblegum px-2.5 py-0.5 text-[10px] font-extrabold text-white opacity-0 shadow transition group-hover:opacity-100">
          Ver productos
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * "Nuestras marcas": dos franjas de carrusel infinito que se mueven en sentidos opuestos.
 * Se pausan al pasar el mouse; al tocar una marca se agranda y lleva a sus productos.
 * Con "reducir movimiento" activado, las franjas no se mueven y se pueden deslizar a mano.
 */
export default function BrandsRow({ suppliers = [] }) {
  if (!suppliers.length) return null;
  const rows = splitRows(suppliers);

  return (
    <section className="relative mt-20 overflow-hidden bg-gradient-to-b from-sky-light/70 via-sky-light/40 to-transparent py-12 md:py-16">
      <div className="container-page flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bubblegum">Nuestras marcas</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-petrol-dark md:text-3xl">Trabajamos con las marcas líderes</h2>
          <p className="mt-1 text-sm text-gray-500">Tocá una marca para ver todos sus productos.</p>
        </div>
        <Link to="/catalogo" className="flex items-center gap-1 text-sm font-extrabold text-petrol hover:text-bubblegum">
          Ver catálogo <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      </div>

      <div className="marquee-mask mt-8 space-y-5 md:mt-10 md:space-y-6">
        {rows.map((row, r) => (
          <div key={r} className="marquee group/row">
            {/* La lista va dos veces seguidas: al llegar a la mitad vuelve al inicio sin que se note */}
            <div
              className={`marquee-track flex w-max gap-4 py-3 pr-4 md:gap-5 md:pr-5 ${r % 2 ? 'marquee-right' : 'marquee-left'}`}
              style={{ '--marquee-duration': `${row.length * 6}s` }}
            >
              {[...row, ...row].map((s, i) => (
                <div key={`${s._id}-${i}`} aria-hidden={i >= row.length ? 'true' : undefined} className="contents">
                  <BrandCard s={s} index={i + r} copy={i >= row.length} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
