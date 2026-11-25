import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { waLink, waGeneralMessage } from '../utils/whatsapp';
import { isOpenNow } from '../utils/schedule';
import PromoCard from '../components/catalog/PromoCard';
import ProductCard, { ProductCardSkeleton } from '../components/catalog/ProductCard';
import BrandsRow from '../components/catalog/BrandsRow';
import SectionHeader from '../components/catalog/SectionHeader';
import Logo from '../components/layout/Logo';
import { Icon, Pagination } from '../components/ui';
import { CATEGORY_COLORS as TILE_COLORS, visibleCategories } from '../utils/categoryColors';

const PER_PAGE = 10;


/** Aparece al entrar en pantalla */
const Reveal = ({ children, delay = 0, className = '' }) => (
  <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
    {children}
  </motion.div>
);

/* ======================= HERO: FACHADA DEL LOCAL ======================= */

/**
 * Hero como la fachada del local: toldo rosa/blanco arriba, fondo celeste
 * y el logo principal completo en el centro. Debajo, el buscador y los botones.
 */
function StorefrontHero() {
  const settings = useSettingsStore((s) => s.settings);
  const open = isOpenNow(settings.schedule);

  return (
    <section className="relative z-10 overflow-x-clip bg-sky text-white">
      {/* Fondo: brillos y golosinas flotando (recortado aparte para no cortar las sugerencias del buscador) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-sky via-sky to-petrol/70" />
        <div className="sparkles animate-twinkle absolute inset-0" />
        {[
          ['🍭', 'left-[5%] top-[38%] text-6xl', 0],
          ['🍫', 'right-[6%] top-[34%] text-5xl', 0.5],
          ['🍬', 'left-[10%] bottom-[18%] text-5xl', 1],
          ['🍪', 'right-[10%] bottom-[20%] text-6xl', 0.3],
        ].map(([e, cls, d]) => (
          <motion.span key={e} className={`absolute hidden select-none drop-shadow-xl lg:block ${cls}`} animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: d, ease: 'easeInOut' }}>
            {e}
          </motion.span>
        ))}
      </div>

      {/* Toldo */}
      <div className="awning-xl-wrap relative">
        <div className="awning-xl animate-sway" />
      </div>

      <div className="container-page relative flex flex-col items-center pb-14 pt-4 text-center md:pb-20 md:pt-2">
        {/* Logo principal completo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
          transition={{ opacity: { duration: 0.5 }, scale: { type: 'spring', damping: 14, stiffness: 120 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 } }}
          whileHover={{ rotate: [0, -3, 3, -2, 0], transition: { duration: 0.6 } }}
        >
          {settings.logoMain?.url ? (
            <Logo variant="main" className="h-32 w-auto max-w-[92vw] drop-shadow-[0_14px_24px_rgba(30,79,97,0.45)] sm:h-44 md:h-56 lg:h-64" />
          ) : (
            <Logo variant="main" light className="text-5xl md:text-7xl" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex w-full flex-col items-center">
          <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:max-w-none sm:justify-center">
            <Link to="/catalogo" className="btn-buy btn-shine px-3 py-3.5 text-sm shadow-[0_14px_30px_-10px_rgba(206,84,135,0.95)] sm:px-7 sm:text-base">
              Ver catálogo <Icon name="chevronRight" className="h-4 w-4" />
            </Link>
            <Link to="/promociones" className="btn bg-white px-3 py-3.5 text-sm text-petrol shadow-[0_14px_30px_-14px_rgba(30,79,97,0.7)] hover:bg-cream sm:px-7 sm:text-base">
              <Icon name="tag" className="h-4 w-4" /> Promociones
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Borde inferior ondulado hacia el fondo crema */}
      <svg className="relative -mb-px block h-8 w-full text-cream md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30c160 25 320 25 480 8S800 0 960 14s320 34 480 18v28H0z" fill="currentColor" />
      </svg>
    </section>
  );
}

/* ======================= BALDOSAS DE CATEGORÍAS ======================= */

function CategoryTiles({ categories, promoCount = 0 }) {
  // Las baldosas de categorías normales (Promos va aparte, siempre primera)
  const cats = visibleCategories(categories).filter((c) => c.slug !== 'promos');
  return (
    <section>
      <Reveal>
        <SectionHeader icon="🍭" eyebrow="Categorías" title="¿Qué estás buscando?" to="/catalogo" linkLabel="Ver catálogo" />
      </Reveal>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {/* Promos: siempre visible, lleva a las promociones vigentes */}
        <Reveal>
          <Link
            to="/promociones"
            className="group relative flex h-36 flex-col justify-between overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-bubblegum via-bubblegum-light to-candy-gold p-4 text-white shadow-card ring-4 ring-bubblegum/20 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-18px_rgba(206,84,135,0.7)] md:h-44 md:p-5"
          >
            <div className="candy-stripes absolute inset-0 opacity-60" aria-hidden="true" />
            <span className="animate-float absolute -right-2 -top-2 select-none text-[4.2rem] leading-none drop-shadow-lg transition duration-300 group-hover:scale-125 md:text-[5.2rem]" style={{ '--r': '12deg' }} aria-hidden="true">
              🏷️
            </span>
            <span className="relative w-fit rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-bubblegum">{promoCount > 0 ? `${promoCount} vigente${promoCount === 1 ? '' : 's'}` : '¡Ofertas!'}</span>
            <span className="relative flex items-end justify-between gap-2">
              <span className="font-display text-lg font-bold leading-tight md:text-xl">Promos</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/25 transition group-hover:translate-x-1" aria-hidden="true">
                <Icon name="chevronRight" className="h-4 w-4" />
              </span>
            </span>
          </Link>
        </Reveal>
        {cats.map((c, i) => {
          const color = TILE_COLORS[i % TILE_COLORS.length];
          return (
            <Reveal key={c._id} delay={Math.min(i * 0.04, 0.3)}>
              <Link
                to={`/catalogo/${c.slug}`}
                className={`group relative flex h-36 flex-col justify-between overflow-hidden rounded-[1.75rem] p-4 ${color.bg} ${color.text} shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-18px_rgba(30,79,97,0.6)] md:h-44 md:p-5`}
              >
                <span className="animate-float absolute -right-2 -top-2 select-none text-[4.2rem] leading-none drop-shadow-lg transition duration-300 group-hover:scale-125 md:text-[5.2rem]" style={{ '--r': '12deg', animationDelay: `${(i % 5) * 0.35}s` }} aria-hidden="true">
                  {c.icon || '🍬'}
                </span>
                <span className={`relative w-fit rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${color.chip}`}>{c.productCount > 0 ? `${c.productCount} productos` : 'Muy pronto'}</span>
                <span className="relative flex items-end justify-between gap-2">
                  <span className="font-display text-lg font-bold leading-tight md:text-xl">{c.name}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/25 transition group-hover:translate-x-1" aria-hidden="true">
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ======================= CARRIL DESLIZABLE ======================= */

function Rail({ children }) {
  return <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-2 md:mx-0 md:gap-4 md:px-0">{children}</div>;
}

/* ======================= EXPLORADOR CON PESTAÑAS ======================= */

function ProductExplorer({ cats }) {
  const [slug, setSlug] = useState(cats[0]?.slug);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const current = cats.find((c) => c.slug === slug) || cats[0];

  useEffect(() => {
    if (!current) return undefined;
    let alive = true;
    setData(null);
    api
      .get('/products', { params: { category: current.slug, limit: PER_PAGE, page } })
      .then(({ data: d }) => alive && setData(d))
      .catch(() => alive && setData({ items: [], page: 1, pages: 1 }));
    return () => {
      alive = false;
    };
  }, [current?.slug, page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const pick = (s) => {
    setSlug(s);
    setPage(1);
  };

  return (
    <section id="explorar" className="scroll-mt-48 rounded-[2rem] bg-white p-4 shadow-card md:p-8">
      <SectionHeader icon="🛒" eyebrow="Comprá por categoría" title="Explorá los productos" to={`/catalogo/${current.slug}`} linkLabel={`Ver todo ${current.name}`} />

      {/* Pestañas */}
      <div role="tablist" aria-label="Categorías" className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {cats.map((c) => {
          const active = c.slug === current.slug;
          return (
            <button
              key={c._id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pick(c.slug)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${active ? 'bg-petrol text-white shadow-[0_8px_18px_-10px_rgba(30,79,97,0.9)]' : 'bg-sky-light/70 text-petrol-dark hover:bg-sky-light'}`}
            >
              <span aria-hidden="true">{c.icon || '🍬'}</span> {c.name}
              <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-white text-petrol'}`}>{c.productCount}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {data ? data.items.map((p) => <ProductCard key={p._id} product={p} />) : Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>

      {data && (
        <Pagination
          page={data.page}
          pages={data.pages}
          onChange={(n) => {
            setPage(n);
            document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}
    </section>
  );
}

/* ======================= PÁGINA ======================= */

export default function Home() {
  useTitle('');
  const settings = useSettingsStore((s) => s.settings);
  const { categories, suppliers, loadedAt } = useCatalogStore();
  const [promos, setPromos] = useState([]);
  const [featured, setFeatured] = useState(null); // null = cargando

  useEffect(() => {
    Promise.allSettled([api.get('/promotions'), api.get('/products/featured')]).then(([p, f]) => {
      setPromos(p.value?.data.items || []);
      setFeatured(f.value?.data.items || []);
    });
  }, []);

  const productCats = categories.filter((c) => c.productCount > 0);
  const productTotal = productCats.reduce((a, c) => a + c.productCount, 0);
  const isEmpty = loadedAt && !productCats.length;

  return (
    <div className="overflow-x-clip">
      <StorefrontHero />

      <div className="container-page mt-10 space-y-16 md:mt-14 md:space-y-20">
        <CategoryTiles categories={categories} promoCount={promos.length} />

        {promos.length > 0 && (
          <section>
            <Reveal>
              <SectionHeader icon="🏷️" eyebrow="Ofertas" title="Promociones vigentes" subtitle="Aprovechalas antes de que se terminen" to="/promociones" linkLabel="Ver todas" />
            </Reveal>
            <Rail>
              {promos.map((p) => (
                <div key={p._id} className="w-[86%] shrink-0 snap-center pt-5 sm:w-[60%] lg:w-[calc(50%-0.5rem)]">
                  <PromoCard promo={p} />
                </div>
              ))}
            </Rail>
          </section>
        )}

        {(featured === null || featured.length > 0) && productCats.length > 0 && (
          <section>
            <Reveal>
              <SectionHeader icon="⭐" eyebrow="Lo más pedido" title="Destacados de la semana" to="/catalogo" />
            </Reveal>
            <Rail>
              {(featured || Array.from({ length: 5 }, (_, i) => ({ _id: `sk-${i}` }))).slice(0, 10).map((p) => (
                <div key={p._id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]">
                  {featured ? <ProductCard product={p} /> : <ProductCardSkeleton />}
                </div>
              ))}
            </Rail>
          </section>
        )}

        {productCats.length > 0 && <ProductExplorer cats={productCats} />}

        {isEmpty && (
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky to-petrol px-6 py-14 text-center text-white">
            <div className="sparkles absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <p className="text-6xl" aria-hidden="true">
                🍬🍫🍭
              </p>
              <h2 className="mt-4 text-3xl md:text-4xl">Estamos llenando los estantes</h2>
              <p className="mx-auto mt-2 max-w-md text-white/90">Muy pronto vas a ver acá todo nuestro catálogo. Mientras tanto, consultanos lo que necesites.</p>
              <a href={waLink(settings.whatsapp, waGeneralMessage())} target="_blank" rel="noreferrer" className="btn mt-6 bg-white px-6 py-3 text-petrol hover:bg-cream">
                <Icon name="whatsapp" className="h-5 w-5" /> Escribinos por WhatsApp
              </a>
            </div>
          </section>
        )}
      </div>

      <BrandsRow suppliers={suppliers} />
    </div>
  );
}
