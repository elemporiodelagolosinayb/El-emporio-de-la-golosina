import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useCartStore, cartTotal, cartPricePending } from '../../store/useCartStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatPrice, itemPrice } from '../../utils/format';
import { SHIPPING_TEXT } from '../../utils/texts';
import ProductPhoto from '../catalog/ProductPhoto';
import Icon from '../ui/Icon';
import { Spinner } from '../ui';

/**
 * Panel "Tu pedido" (como en la referencia): se abre desde la derecha al agregar un producto
 * o al tocar el carrito. Revalida precios y stock contra el back cada vez que se abre.
 */
export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, setQuantity, remove, replaceFromServer } = useCartStore();
  const minOrder = useSettingsStore((s) => s.settings.minOrderAmount) || 0;
  const [validating, setValidating] = useState(false);
  const [notice, setNotice] = useState([]);
  const panelRef = useRef(null);

  // Revalidar al abrir
  useEffect(() => {
    if (!drawerOpen) return;
    const current = useCartStore.getState().items;
    setNotice([]);
    if (!current.length) return;
    setValidating(true);
    api
      .post('/cart/validate', { items: current.map((i) => ({ type: i.type, id: i.id, quantity: i.quantity, price: i.price })) })
      .then(({ data }) => {
        replaceFromServer(data.items);
        setNotice(data.issues.map((i) => i.msg));
      })
      .catch(() => {})
      .finally(() => setValidating(false));
  }, [drawerOpen, replaceFromServer]);

  // Esc para cerrar + bloquear el scroll de fondo
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, closeDrawer]);

  const listTotal = Math.round(items.reduce((a, i) => a + (i.listPrice ?? i.price) * i.quantity, 0) * 100) / 100;
  const subtotal = cartTotal(items);
  const savings = Math.round((listTotal - subtotal) * 100) / 100;
  const pricePending = cartPricePending(items);
  const missing = pricePending ? 0 : Math.max(0, minOrder - subtotal);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <motion.button type="button" aria-label="Cerrar carrito" className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 330 }}
          >
            <div className="flex items-center justify-between border-b border-petrol/10 px-5 py-4">
              <h2 id="cart-drawer-title" className="flex items-center gap-2 text-xl text-petrol-dark">
                Tu pedido ({items.length}) {validating && <Spinner className="h-4 w-4" />}
              </h2>
              <button type="button" onClick={closeDrawer} className="rounded-full p-1 text-gray-400 hover:text-ink" aria-label="Cerrar">
                <Icon name="close" className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {notice.length > 0 && (
                <ul className="mb-4 space-y-1 rounded-xl bg-candy-gold/20 px-3 py-2 text-xs font-semibold text-ink">
                  {notice.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}

              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                  <Icon name="cart" className="h-10 w-10" />
                  <p className="mt-2 text-sm">Todavía no agregaste productos.</p>
                  <Link to="/catalogo" onClick={closeDrawer} className="mt-3 text-sm font-extrabold text-bubblegum hover:underline">
                    Ir al catálogo
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((i) => (
                    <li key={`${i.type}:${i.id}`} className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-petrol/5 bg-white">
                        {i.image ? <ProductPhoto url={i.image} alt={i.name} width={160} /> : <div className="grid h-full place-items-center bg-sky-light text-2xl">🍬</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{i.name}</p>
                        <p className="text-xs text-gray-400">
                          Unidad · {i.discountPercent > 0 && i.listPrice > i.price && <span className="mr-1 line-through">{formatPrice(i.listPrice)}</span>}
                          {itemPrice(i.price)}
                          {i.discountPercent > 0 && <span className="ml-1 font-extrabold text-bubblegum">-{i.discountPercent}%</span>}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-full border border-petrol/15">
                            <button type="button" className="px-2.5 py-1 text-gray-500 hover:text-bubblegum disabled:opacity-30" disabled={i.quantity <= 1} onClick={() => setQuantity(i.type, i.id, i.quantity - 1)} aria-label="Restar">
                              −
                            </button>
                            <span className="min-w-[2ch] text-center text-sm font-bold">{i.quantity}</span>
                            <button type="button" className="px-2.5 py-1 text-gray-500 hover:text-bubblegum disabled:opacity-30" disabled={i.maxStock != null && i.quantity >= i.maxStock} onClick={() => setQuantity(i.type, i.id, i.quantity + 1)} aria-label="Sumar">
                              +
                            </button>
                          </div>
                          <button type="button" onClick={() => remove(i.type, i.id)} className="text-xs font-semibold text-gray-400 hover:text-red-600">
                            Quitar
                          </button>
                        </div>
                        {i.maxStock != null && i.quantity >= i.maxStock && <p className="mt-1 text-[11px] font-semibold text-candy-gold">Máximo disponible: {i.maxStock}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-extrabold text-ink">{itemPrice(i.price * i.quantity)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-petrol/10 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                {minOrder > 0 &&
                  (missing > 0 ? (
                    <p className="mb-3 rounded-xl bg-bubblegum/10 px-3 py-2 text-xs font-semibold text-bubblegum">
                      Te faltan {formatPrice(missing)} para alcanzar el mínimo de compra ({formatPrice(minOrder)}).
                    </p>
                  ) : (
                    <p className="mb-3 rounded-xl bg-mint/30 px-3 py-2 text-xs font-semibold text-petrol-dark">¡Superaste el monto mínimo de compra!</p>
                  ))}
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-sky-light/70 px-3 py-2 text-xs font-semibold text-petrol-dark">
                  <Icon name="truck" className="h-4 w-4 shrink-0" /> Pagás por transferencia. {SHIPPING_TEXT}
                </p>
                <div className="mb-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Productos</span>
                    <span>{formatPrice(listTotal)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between font-bold text-bubblegum">
                      <span>Promociones</span>
                      <span>−{formatPrice(savings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-petrol/10 pt-2 text-base font-extrabold text-ink">
                    <span>Subtotal (sin envío)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {pricePending && <p className="text-xs font-bold text-petrol">+ productos con precio a confirmar (te lo pasamos por WhatsApp)</p>}
                </div>
                <Link
                  to="/checkout"
                  onClick={closeDrawer}
                  aria-disabled={missing > 0 || validating}
                  className={`btn-buy w-full py-3.5 text-base ${missing > 0 || validating ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Finalizar pedido
                </Link>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
