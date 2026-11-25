import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useCatalogStore } from '../store/useCatalogStore';
import ProductCard, { ProductCardSkeleton } from '../components/catalog/ProductCard';
import PromoCard from '../components/catalog/PromoCard';
import CatalogFilters from '../components/catalog/CatalogFilters';
import { motion } from 'framer-motion';
import { colorOf, visibleCategories, promosLink } from '../utils/categoryColors';
import { EmptyState, Icon, Pagination } from '../components/ui';

const SORTS = [
  { value: 'name_asc', label: 'A–Z' },
  { value: 'name_desc', label: 'Z–A' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
];

export default function Catalog() {
  const { categoria } = useParams();
  const [params, setParams] = useSearchParams();
  const categories = useCatalogStore((s) => s.categories);
  const [suppliers, setSuppliers] = useState([]);
  const [promos, setPromos] = useState([]);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // El texto de búsqueda viene del buscador del header (?q=)
  const q = (params.get('q') || '').trim();
  const supplier = params.get('proveedor') || '';
  const sort = params.get('orden') || 'name_asc';
  const inStock = params.get('stock') === '1';
  const page = Math.max(1, parseInt(params.get('pagina'), 10) || 1);
  const promoId = params.get('promo') || '';
  const [promo, setPromo] = useState(null);

  // ?promo=<id>: catálogo filtrado por los productos de esa promoción
  useEffect(() => {
    if (!promoId) return setPromo(null);
    api.get(`/promotions/${promoId}`).then(({ data }) => setPromo(data.item)).catch(() => setPromo({ expired: true }));
  }, [promoId]);

  const current = categories.find((c) => c.slug === categoria);
  const color = current ? colorOf(categories, categoria) : { from: 'from-petrol', to: 'to-sky', text: 'text-white' };
  useTitle(current?.name || 'Catálogo');

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'pagina') next.delete('pagina');
    setParams(next, { replace: true });
  };

  // Proveedores con productos (combinables con la categoría actual)
  useEffect(() => {
    api.get('/suppliers', { params: { category: categoria } }).then(({ data }) => setSuppliers(data.items)).catch(() => {});
  }, [categoria]);

  // "Promos": primero las promociones vigentes del módulo de Promociones
  useEffect(() => {
    if (categoria === 'promos') api.get('/promotions').then(({ data }) => setPromos(data.items)).catch(() => setPromos([]));
    else setPromos([]);
  }, [categoria]);

  const query = useMemo(() => ({ category: categoria, supplier, q, sort, limit: 20, inStock: inStock ? 'true' : undefined, promo: promoId || undefined }), [categoria, supplier, q, sort, inStock, promoId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get('/products', { params: { ...query, page } })
      .then(({ data }) => {
        if (!alive) return;
        setItems(data.items);
        setMeta({ page: data.page, pages: data.pages, total: data.total });
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, page]);

  const goToPage = (n) => {
    updateParam('pagina', n > 1 ? String(n) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedSuppliers = supplier.split(',').filter(Boolean);
  const supplierNames = selectedSuppliers.map((slug) => suppliers.find((s) => s.slug === slug)?.name || slug);
  const title = current ? `${current.icon ? `${current.icon} ` : ''}${current.name}` : 'Todos los productos';
  const activeCount = (q ? 1 : 0) + selectedSuppliers.length + (inStock ? 1 : 0);

  // Query string para los links de categorías (mantiene los filtros, vuelve a la página 1)
  const keep = new URLSearchParams(params);
  keep.delete('pagina');
  const search = keep.toString() ? `?${keep.toString()}` : '';

  const toggleSupplier = (slug) => {
    const next = selectedSuppliers.includes(slug) ? selectedSuppliers.filter((s) => s !== slug) : [...selectedSuppliers, slug];
    updateParam('proveedor', next.join(','));
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    ['q', 'proveedor', 'stock', 'pagina'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };

  const filterProps = {
    categories,
    currentSlug: categoria,
    suppliers,
    selectedSuppliers,
    q,
    inStock,
    search,
    onSearch: (text) => updateParam('q', text),
    onToggleSupplier: toggleSupplier,
    onInStock: (v) => updateParam('stock', v ? '1' : ''),
    onClear: clearFilters,
  };

  return (
    <div>
      {/* Portada de color (cada categoría con su color y su emoji) */}
      <motion.header
        key={categoria || 'all'}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br ${color.from} ${color.to} px-6 py-7 ${color.text} shadow-card md:px-10 md:py-10`}
      >
        <div className="candy-stripes absolute inset-0 opacity-50" aria-hidden="true" />
        <span className="animate-float absolute -bottom-6 right-2 select-none text-[7rem] leading-none drop-shadow-xl md:right-10 md:text-[10rem]" style={{ '--r': '-10deg' }} aria-hidden="true">
          {current?.icon || '🛍️'}
        </span>
        <nav className="relative flex items-center gap-1.5 text-xs font-bold opacity-85 md:text-sm" aria-label="Ubicación">
          <Link to="/" className="hover:underline">Inicio</Link>
          <Icon name="chevronRight" className="h-3.5 w-3.5" />
          <Link to="/catalogo" className="hover:underline">Catálogo</Link>
          {current && (
            <>
              <Icon name="chevronRight" className="h-3.5 w-3.5" />
              <span>{current.name}</span>
            </>
          )}
        </nav>
        <h1 className="relative mt-2 max-w-[70%] text-4xl font-bold leading-none md:text-6xl">{current?.name || (q ? `“${q}”` : 'Todos los productos')}</h1>
        <p className="relative mt-3 text-sm font-bold opacity-90 md:text-base">{loading
            ? 'Buscando…'
            : categoria === 'promos'
              ? `${promos.length} promoci${promos.length === 1 ? 'ón vigente' : 'ones vigentes'}${meta.total ? ` · ${meta.total} combo${meta.total === 1 ? '' : 's'}` : ''}`
              : `${meta.total} producto${meta.total === 1 ? '' : 's'}`}</p>
      </motion.header>

      {/* Categorías en celular: tira deslizable */}
      <nav aria-label="Categorías" className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:hidden">
        <Link
          to={promosLink(categories)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-card transition ${categoria === 'promos' ? 'bg-gradient-to-r from-bubblegum to-candy-gold text-white' : 'bg-white text-bubblegum ring-2 ring-bubblegum/30'}`}
        >
          <span aria-hidden="true">🏷️</span> Promos
        </Link>
        {[{ _id: 'all', slug: '', name: 'Todas', icon: '🛍️' }, ...visibleCategories(categories).filter((c) => c.slug !== 'promos')].map((c) => {
          const active = (categoria || '') === c.slug;
          const cc = c.slug ? colorOf(categories, c.slug) : { bg: 'bg-petrol', text: 'text-white' };
          return (
            <Link
              key={c._id}
              to={`/catalogo${c.slug ? `/${c.slug}` : ''}${search}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${active ? `${cc.bg} ${cc.text} shadow-card` : 'bg-white text-petrol-dark shadow-card'}`}
            >
              <span aria-hidden="true">{c.icon || '🍬'}</span> {c.name}
            </Link>
          );
        })}
      </nav>

      {promoId && promo && (
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-bubblegum to-bubblegum-light p-5 text-white">
          <div className="sparkles absolute inset-0 opacity-40" aria-hidden="true" />
          {promo.expired ? (
            <p className="relative font-bold">Esa promoción ya no está vigente. <button type="button" className="underline" onClick={() => updateParam('promo', '')}>Ver todo el catálogo</button></p>
          ) : (
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-90">{promo.occasionLabel || 'Promoción'} · hasta el {new Date(promo.endDate).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
                <p className="font-display text-2xl font-semibold">{promo.title} <span className="ml-1 rounded-full bg-white px-2.5 py-0.5 text-lg text-bubblegum">-{promo.discountPercent}%</span></p>
                <p className="text-sm opacity-90">El descuento ya está aplicado en los precios.</p>
              </div>
              <button type="button" onClick={() => updateParam('promo', '')} className="btn bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30">
                Quitar filtro <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[270px_minmax(0,1fr)]">
        {/* Panel de filtros (escritorio) */}
        <aside className="hidden md:block">
          <div className="sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-3xl bg-white p-5 shadow-card scrollbar-none">
            <CatalogFilters {...filterProps} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Ordenar: botones a la vista */}
          <div className="mb-4 flex items-center gap-2">
            <span className="shrink-0 text-sm font-extrabold text-petrol-dark">Ordenar:</span>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto py-1">
              {SORTS.map((o) => {
                const active = sort === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => updateParam('orden', o.value === 'name_asc' ? '' : o.value)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-card transition ${active ? 'bg-petrol text-white' : 'bg-white text-petrol-dark hover:bg-sky-light'}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtros activos */}
          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {q && (
                <button type="button" onClick={() => updateParam('q', '')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-petrol-dark shadow-card hover:text-bubblegum">
                  <Icon name="search" className="h-3.5 w-3.5" /> “{q}” <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              )}
              {selectedSuppliers.map((slug, i) => (
                <button key={slug} type="button" onClick={() => toggleSupplier(slug)} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-petrol-dark shadow-card hover:text-bubblegum">
                  {supplierNames[i]} <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              ))}
              {inStock && (
                <button type="button" onClick={() => updateParam('stock', '')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-petrol-dark shadow-card hover:text-bubblegum">
                  Con stock <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={clearFilters} className="px-2 text-xs font-extrabold text-bubblegum hover:underline">
                Limpiar todo
              </button>
            </div>
          )}

          {promos.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl text-bubblegum">Promociones vigentes</h2>
              <div className="grid gap-6 xl:grid-cols-2">
                {promos.map((p) => (
                  <PromoCard key={p._id} promo={p} />
                ))}
              </div>
              {items.length > 0 && <h2 className="mb-4 mt-10 text-2xl text-petrol-dark">Combos y packs</h2>}
            </section>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 && promos.length === 0 ? (
            activeCount > 0 ? (
              <EmptyState icon="search" title="No encontramos productos">
                Probá con otra búsqueda o categoría.
                <div>
                  <button type="button" onClick={clearFilters} className="btn-primary mt-4">
                    Limpiar filtros
                  </button>
                </div>
              </EmptyState>
            ) : (
              <EmptyState icon="box" title={current ? `Pronto vas a encontrar ${current.name.toLowerCase()} acá` : 'Estamos llenando los estantes'}>
                Mientras tanto, mirá otras categorías o escribinos por WhatsApp.
              </EmptyState>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
          {!loading && <Pagination page={meta.page} pages={meta.pages} onChange={goToPage} className="mt-8" />}
        </div>
      </div>

    </div>
  );
}
