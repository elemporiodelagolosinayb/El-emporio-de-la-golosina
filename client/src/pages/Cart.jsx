import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTitle } from '../hooks';
import { useCartValidation } from '../hooks/useCartValidation';
import { useCartStore, cartTotal, cartCount, cartPricePending } from '../store/useCartStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatPrice, itemPrice } from '../utils/format';
import { SHIPPING_TEXT } from '../utils/texts';
import ProductPhoto from '../components/catalog/ProductPhoto';
import { confirmAction } from '../utils/alerts';
import { EmptyState, Icon, QuantityInput, Spinner } from '../components/ui';

export default function Cart() {
  useTitle('Carrito');
  const { items, validating } = useCartValidation();
  const { setQuantity, remove, clear } = useCartStore();
  const minOrder = useSettingsStore((s) => s.settings.minOrderAmount);
  const total = cartTotal(items);
  const pricePending = cartPricePending(items);
  const belowMin = !pricePending && minOrder > 0 && total < minOrder;

  if (!items.length)
    return (
      <EmptyState icon="cart" title="Tu carrito está vacío">
        <Link to="/catalogo" className="btn-buy mt-4">
          Ver catálogo
        </Link>
      </EmptyState>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-3xl text-petrol">Tu carrito</h1>
          {validating && (
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner className="h-4 w-4" /> Actualizando precios y stock…
            </span>
          )}
        </div>
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.li key={`${i.type}:${i.id}`} layout exit={{ opacity: 0, x: -40 }} className="card flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                  {i.image ? <ProductPhoto url={i.image} width={160} /> : <div className="grid h-full place-items-center bg-sky-light text-3xl">{i.type === 'promotion' ? '🎁' : '🍬'}</div>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {i.type === 'promotion' && <span className="badge bg-bubblegum-light text-white">PROMO</span>}
                      {i.supplier && <p className="text-[11px] font-extrabold uppercase tracking-wider text-sky">{i.supplier}</p>}
                      {i.slug ? (
                        <Link to={`/producto/${i.slug}`} className="line-clamp-2 font-bold leading-tight hover:text-petrol">
                          {i.name}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 font-bold leading-tight">{i.name}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {i.discountPercent > 0 && <span className="mr-1.5 badge bg-bubblegum text-white">-{i.discountPercent}%</span>}
                        {i.discountPercent > 0 && i.listPrice > i.price && <span className="mr-1 line-through">{formatPrice(i.listPrice)}</span>}
                        {i.price > 0 ? `${formatPrice(i.price)} c/u` : 'Precio a confirmar'}
                      </p>
                    </div>
                    <button type="button" onClick={() => remove(i.type, i.id)} className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Quitar ${i.name}`}>
                      <Icon name="trash" className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QuantityInput value={i.quantity} onChange={(q) => setQuantity(i.type, i.id, q)} max={i.maxStock ?? undefined} size="sm" />
                    <span className="text-lg font-black text-petrol-dark">{itemPrice(i.price * i.quantity)}</span>
                  </div>
                  {i.maxStock != null && i.quantity >= i.maxStock && <p className="mt-1 text-xs font-bold text-candy-gold">Máximo disponible: {i.maxStock}</p>}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <button
          type="button"
          className="btn-ghost btn-sm mt-3"
          onClick={async () => (await confirmAction('¿Vaciar el carrito?', 'Se quitarán todos los productos.', 'Vaciar')) && clear()}
        >
          <Icon name="trash" className="h-4 w-4" /> Vaciar carrito
        </button>
      </section>

      <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-28">
        <h2 className="text-xl text-petrol-dark">Resumen</h2>
        <div className="flex justify-between text-sm">
          <span>Productos ({cartCount(items)})</span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
        <div className="flex items-end justify-between border-t border-sky-light pt-3">
          <span className="font-bold">Total</span>
          <span className="text-3xl font-black text-bubblegum">{formatPrice(total)}</span>
        </div>
        <div>
          {pricePending && <p className="text-xs font-bold text-petrol">+ productos con precio a confirmar (te lo pasamos por WhatsApp)</p>}
        </div>
        <p className="text-xs text-gray-500">Pago por transferencia bancaria. {SHIPPING_TEXT}</p>
        {belowMin && <p className="rounded-xl bg-candy-gold/25 p-3 text-sm font-bold text-ink">El pedido mínimo es de {formatPrice(minOrder)}. Te faltan {formatPrice(minOrder - total)}.</p>}
        <Link to="/checkout" className={`btn-buy w-full py-3 ${belowMin || validating ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={belowMin || validating}>
          Continuar compra
        </Link>
        <Link to="/catalogo" className="btn-ghost w-full">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
