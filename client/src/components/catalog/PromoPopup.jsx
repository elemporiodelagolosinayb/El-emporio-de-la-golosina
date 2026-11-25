import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cld } from '../../utils/cloudinary';
import Icon from '../ui/Icon';
import { PromoPrice, promoRange } from './PromoCard';

const SEEN_KEY = 'emporio-promo-popup-seen';

/**
 * Cartel de promociones al entrar a la tienda (una vez por sesión).
 * Se activa/desactiva desde Admin → Promociones, y cada promo elige si sale acá.
 */
export default function PromoPopup() {
  const enabled = useSettingsStore((s) => s.settings.promoPopupEnabled !== false);
  const loadedAt = useSettingsStore((s) => s.loadedAt);
  const { pathname } = useLocation();
  const [promos, setPromos] = useState([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!loadedAt || !enabled || pathname !== '/') return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* sin storage: se muestra igual */
    }
    if (seen) return;
    api
      .get('/promotions', { params: { popup: 'true' } })
      .then(({ data }) => {
        if (!data.items.length) return;
        setPromos(data.items);
        setOpen(true);
      })
      .catch(() => {});
    // Solo al entrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt, enabled]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignorar */
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const p = promos[idx];

  return (
    <AnimatePresence>
      {open && p && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Promociones vigentes"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="relative aspect-[4/3] bg-gradient-to-br from-bubblegum to-petrol">
              {p.image?.url ? (
                <img src={cld(p.image.url, 800)} alt={p.title} className="h-full w-full object-cover" />
              ) : (
                <div className="sparkles grid h-full place-items-center">
                  <span className="font-display text-7xl font-bold text-white drop-shadow-lg">-{p.discountPercent}%</span>
                </div>
              )}
              <span className="badge absolute left-3 top-3 bg-white px-3 py-1 text-bubblegum shadow">{p.occasionLabel ? p.occasionLabel.toUpperCase() : 'PROMOCIÓN'}</span>
              <span className="badge absolute bottom-3 left-3 bg-bubblegum px-3 py-1 text-base text-white shadow">-{p.discountPercent}%</span>
              <button type="button" onClick={close} aria-label="Cerrar" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow hover:bg-cream">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-2xl leading-tight text-petrol-dark">{p.title}</h2>
              {p.description && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-gray-600">{p.description}</p>}
              <div className="mt-4">
                <PromoPrice promo={p} size="lg" />
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Icon name="clock" className="h-3.5 w-3.5" /> {promoRange(p)}
                </p>
              </div>

              {promos.length > 1 && (
                <div className="mt-5 flex items-center justify-between">
                  <button type="button" onClick={() => setIdx((i) => (i - 1 + promos.length) % promos.length)} aria-label="Promoción anterior" className="grid h-9 w-9 place-items-center rounded-full border border-petrol/15 text-petrol hover:border-bubblegum hover:text-bubblegum">
                    <Icon name="chevronLeft" className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {promos.map((x, i) => (
                      <button key={x._id} type="button" onClick={() => setIdx(i)} aria-label={`Ver promoción ${i + 1} de ${promos.length}`} className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-bubblegum' : 'w-2 bg-gray-300'}`} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setIdx((i) => (i + 1) % promos.length)} aria-label="Promoción siguiente" className="grid h-9 w-9 place-items-center rounded-full border border-petrol/15 text-petrol hover:border-bubblegum hover:text-bubblegum">
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-petrol/10 px-6 py-4">
              {promos.length > 1 ? (
                <Link to="/promociones" onClick={close} className="btn-buy flex-1">
                  Ver las {promos.length} promociones
                </Link>
              ) : (
                <Link to={`/catalogo?promo=${p._id}`} onClick={close} className="btn-buy flex-1">
                  Ver productos en promo
                </Link>
              )}
              <button type="button" onClick={close} className="px-3 text-sm font-bold text-gray-500 hover:text-petrol">
                Ahora no
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
