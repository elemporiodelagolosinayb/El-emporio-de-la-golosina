import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useDebounce } from '../../hooks';
import { useCatalogStore } from '../../store/useCatalogStore';
import { normalizeText } from '../../utils/text';
import { formatPrice, hasPrice } from '../../utils/format';
import ProductPhoto from '../catalog/ProductPhoto';
import Icon from '../ui/Icon';

/**
 * Buscador con sugerencias en vivo: mientras escribís muestra categorías y productos
 * (foto, marca, precio). Flechas ↑↓ para moverse, Enter para abrir, Esc para cerrar.
 */
export default function SearchBar({ className = '', size = 'md', placeholder = '¿Qué estás buscando? Alfajores, Arcor…' }) {
  const big = size === 'lg';
  const id = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const categories = useCatalogStore((s) => s.categories);
  const [q, setQ] = useState(params.get('q') || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ items: [], total: 0 });
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const term = useDebounce(q.trim(), 250);

  // Al navegar por el catálogo, el buscador muestra la búsqueda actual
  useEffect(() => {
    if (pathname.startsWith('/catalogo')) setQ(params.get('q') || '');
    setOpen(false);
  }, [params, pathname]);

  // Buscar sugerencias
  useEffect(() => {
    if (term.length < 2) {
      setResults({ items: [], total: 0 });
      return undefined;
    }
    let alive = true;
    setLoading(true);
    api
      .get('/products', { params: { q: term, limit: 5 } })
      .then(({ data }) => alive && setResults({ items: data.items, total: data.total }))
      .catch(() => alive && setResults({ items: [], total: 0 }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [term]);

  // Cerrar al tocar afuera
  useEffect(() => {
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const catMatches = term.length >= 2 ? categories.filter((c) => normalizeText(c.name).includes(normalizeText(term))).slice(0, 3) : [];
  // Opciones navegables con el teclado (en el orden en que se ven)
  const options = [
    ...catMatches.map((c) => ({ key: `c-${c._id}`, to: `/catalogo/${c.slug}` })),
    ...results.items.map((p) => ({ key: `p-${p._id}`, to: `/producto/${p.slug}` })),
    ...(results.total > 0 ? [{ key: 'all', to: `/catalogo?q=${encodeURIComponent(term)}` }] : []),
  ];
  const showPanel = open && term.length >= 2;

  const go = (to) => {
    setOpen(false);
    setActive(-1);
    navigate(to);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    const base = pathname.startsWith('/catalogo') ? pathname : '/catalogo';
    go(q.trim() ? `${base}?q=${encodeURIComponent(q.trim())}` : base);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!showPanel || !options.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    }
  };

  const optCls = (key) => (options[active]?.key === key ? 'bg-sky-light' : 'hover:bg-sky-light/60');

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <label htmlFor={id} className="sr-only">
          Buscar productos
        </label>
        <Icon name="search" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${big ? "left-5 h-5 w-5" : "left-4 h-[18px] w-[18px]"}`} />
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-expanded={showPanel}
          aria-controls={`${id}-panel`}
          className={big ? "h-14 w-full rounded-full border-0 bg-white pl-12 pr-28 text-base text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-candy-gold/60" : "h-11 w-full rounded-full border border-petrol/15 bg-sky-light/40 pl-11 pr-24 text-[15px] placeholder:text-gray-500 focus:border-sky focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky/20"}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setOpen(false); }} className={`absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-sky-light hover:text-petrol ${big ? 'right-[7.2rem]' : 'right-12'}`} aria-label="Borrar búsqueda">
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
        {big ? (
          <button type="submit" className="absolute right-1.5 top-1.5 flex h-11 items-center gap-1.5 rounded-full bg-bubblegum px-5 text-sm font-extrabold text-white transition hover:bg-bubblegum-light">
            Buscar
          </button>
        ) : (
          <button type="submit" className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-petrol text-white transition hover:bg-petrol-dark" aria-label="Buscar">
            <Icon name="chevronRight" className="h-[18px] w-[18px]" strokeWidth={2.6} />
          </button>
        )}
      </form>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id={`${id}-panel`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-3xl border border-petrol/10 bg-white shadow-[0_24px_50px_-20px_rgba(30,79,97,0.55)]"
          >
            {catMatches.length > 0 && (
              <div className="border-b border-petrol/10 p-3">
                <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Categorías</p>
                <div className="flex flex-wrap gap-1.5">
                  {catMatches.map((c) => (
                    <button key={c._id} type="button" onClick={() => go(`/catalogo/${c.slug}`)} className={`flex items-center gap-1.5 rounded-full border border-petrol/10 px-3 py-1.5 text-sm font-bold text-petrol-dark ${optCls(`c-${c._id}`)}`}>
                      <span aria-hidden="true">{c.icon || '🍬'}</span> {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2">
              {loading && !results.items.length ? (
                <div className="space-y-2 p-2" aria-label="Buscando">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-sky-light" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-sky-light" />
                        <div className="h-3 w-1/3 rounded bg-sky-light" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.items.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-3xl" aria-hidden="true">🔍</p>
                  <p className="mt-1 text-sm font-bold text-petrol-dark">No encontramos “{term}”</p>
                  <p className="text-xs text-gray-500">Probá con otra palabra o mirá las categorías.</p>
                </div>
              ) : (
                <ul>
                  {results.items.map((p) => (
                    <li key={p._id}>
                      <Link to={`/producto/${p.slug}`} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl p-2 ${optCls(`p-${p._id}`)}`}>
                        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-sky-light/60">
                          {p.image?.url ? <ProductPhoto url={p.image.url} width={120} /> : <span className="text-xl">🍬</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          {p.supplier?.name && <span className="block text-[10px] font-extrabold uppercase tracking-wide text-sky">{p.supplier.name}</span>}
                          <span className="block truncate text-sm font-bold text-ink">{p.name}</span>
                          <span className="text-xs text-gray-500">{!hasPrice(p) ? 'Precio a consultar' : p.stock > 0 ? `${p.stock} disponibles` : 'Sin stock'}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          {hasPrice(p) ? (
                            <>
                              {p.discountPercent > 0 && <span className="block text-[11px] font-semibold text-gray-400 line-through">{formatPrice(p.price)}</span>}
                              <span className="font-display text-base font-bold text-petrol-dark">{formatPrice(p.finalPrice ?? p.price)}</span>
                            </>
                          ) : (
                            <span className="text-xs font-extrabold text-petrol">Consultar</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {results.total > 0 && (
              <button type="button" onClick={() => go(`/catalogo?q=${encodeURIComponent(term)}`)} className={`flex w-full items-center justify-center gap-1.5 border-t border-petrol/10 py-3 text-sm font-extrabold text-bubblegum ${optCls('all')}`}>
                Ver los {results.total} resultados <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
