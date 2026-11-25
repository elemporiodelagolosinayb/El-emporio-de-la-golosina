import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCartStore, savePendingAdd } from '../../store/useCartStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatPrice, hasPrice, tracksStock } from '../../utils/format';
import { waLink, waProductMessage } from '../../utils/whatsapp';
import ProductPhoto from './ProductPhoto';
import { notifySuccess, notifyError, confirmAction } from '../../utils/alerts';
import Icon from '../ui/Icon';
import { stockState } from './StockBadge';

/** Agrega un producto al carrito: con stock cargado respeta el límite; sin precio/stock se pide "a confirmar" */
export function useAddProduct(product) {
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const inCart = useCartStore((s) => s.items.find((i) => i.type === 'product' && i.id === product._id)?.quantity || 0);
  const tracked = tracksStock(product);
  const available = tracked ? Math.max(0, product.stock - inCart) : Infinity;

  const customer = useCustomerStore((s) => s.customer);
  const navigate = useNavigate();
  const location = useLocation();

  const item = {
    type: 'product',
    id: product._id,
    name: product.name,
    price: product.finalPrice ?? product.price,
    listPrice: product.price,
    discountPercent: product.discountPercent || 0,
    image: product.image?.url || '',
    slug: product.slug,
    supplier: product.supplier?.name || '',
    maxStock: tracked ? product.stock : null,
  };

  const addToCart = async (qty, { silent = false } = {}) => {
    // Comprar requiere haber ingresado (el catálogo se puede ver sin cuenta)
    if (!customer) {
      const ok = await confirmAction('Ingresá para comprar', 'Para comprar tenés que ingresar con tu celular. Al volver, el producto queda en tu carrito.', 'Ingresar');
      if (!ok) return;
      savePendingAdd(item, qty);
      navigate('/ingresar', { state: { from: location.pathname + location.search } });
      return;
    }
    if (available <= 0) return notifyError('Ya tenés todo el stock disponible en el carrito');
    const q = Math.min(qty, available);
    add(item, q);
    if (silent) return;
    if (q < qty) notifySuccess(`Agregamos ${q} (stock disponible)`);
    openDrawer();
  };
  return { addToCart, inCart, available };
}

const BADGE = {
  out: ['bg-gray-200 text-gray-600', 'Sin stock'],
  low: ['bg-candy-gold text-ink', '¡Últimas!'],
};

/**
 * Card de producto (diseño propio): foto sobre "repisa" celeste, marca como etiquetita,
 * precio con calcomanía de descuento y botón ancho "Agregar" que se vuelve − cantidad +.
 */
export default function ProductCard({ product }) {
  const threshold = useSettingsStore((s) => s.settings.lowStockThreshold);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const { addToCart, inCart, available } = useAddProduct(product);
  const tracked = tracksStock(product);
  const state = tracked ? stockState(product.stock, threshold) : null;
  const priced = hasPrice(product);
  const out = false; // sin stock cargado se vende "a confirmar"
  const buyable = available > 0;
  const hasDiscount = priced && product.discountPercent > 0;
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
      whileHover={{ rotate: -0.8 }}
      className="group flex h-full flex-col rounded-3xl bg-white p-2 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-20px_rgba(30,79,97,0.45)]"
    >
      <Link to={`/producto/${product.slug}`} className={`relative block aspect-square overflow-hidden rounded-[1.35rem] ${product.image?.url ? 'ring-1 ring-petrol/5' : 'bg-gradient-to-b from-sky-light via-sky-light/50 to-white'}`}>
        {product.image?.url ? (
          <ProductPhoto url={product.image.url} alt={product.name} width={500} className={out ? 'opacity-40 grayscale' : ''} pad="p-2" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-5xl transition-transform duration-500 group-hover:scale-110">🍬</div>
        )}

        {/* Calcomanía de descuento */}
        {hasDiscount && (
          <span className="absolute right-2 top-2 grid h-12 w-12 rotate-12 place-items-center rounded-full bg-candy-gold text-center font-display text-sm font-bold leading-none text-ink shadow-md">
            -{product.discountPercent}%
          </span>
        )}
        <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.promo?.occasion && <span className="badge bg-bubblegum text-white">{product.promo.occasion}</span>}
          {!hasDiscount && product.featured && !out && <span className="badge bg-petrol text-white">★ Destacado</span>}
          {BADGE[state] && <span className={`badge ${BADGE[state][0]}`}>{BADGE[state][1]}</span>}
        </span>
        {product.supplier?.name && (
          <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-petrol shadow-sm">
            {product.supplier.name}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <Link to={`/producto/${product.slug}`} title={product.name} className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink hover:text-bubblegum">
          {product.name}
        </Link>

        {priced ? (
          <>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-xl font-bold text-petrol-dark">{formatPrice(product.finalPrice ?? product.price)}</span>
              {hasDiscount && <span className="text-xs font-semibold text-gray-400 line-through">{formatPrice(product.price)}</span>}
            </div>
            <p className="text-[11px] font-semibold text-gray-400">{tracked ? `${product.stock} disponibles` : 'Disponibilidad a confirmar'}</p>
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-lg font-bold text-petrol">Consultar precio</p>
            <p className="text-[11px] font-semibold text-gray-400">Pedilo y te lo confirmamos por WhatsApp</p>
          </>
        )}

        {/* Comprar + Consultar en todos los productos */}
        <div className="mt-auto space-y-2 pt-3">
          {inCart > 0 ? (
            <div className="flex h-10 items-center justify-between rounded-2xl bg-bubblegum/10 text-bubblegum">
              <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl hover:bg-bubblegum/15" aria-label="Restar" onClick={() => (inCart <= 1 ? remove('product', product._id) : setQuantity('product', product._id, inCart - 1))}>
                {inCart <= 1 ? <Icon name="trash" className="h-4 w-4" /> : <Icon name="minus" className="h-4 w-4" />}
              </button>
              <span className="text-sm font-extrabold">{inCart} <span className="font-semibold">en pedido</span></span>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl hover:bg-bubblegum/15 disabled:opacity-30" aria-label="Sumar" disabled={available <= 0} onClick={() => addToCart(1, { silent: true })}>
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!buyable}
              onClick={() => addToCart(1)}
              aria-label={`Comprar ${product.name}`}
              title={priced ? undefined : 'El precio se confirma por WhatsApp después del pedido'}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-bubblegum text-sm font-extrabold text-white transition hover:bg-bubblegum-light active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              <Icon name="cart" className="h-4 w-4" /> {buyable ? 'Comprar' : 'Máximo en el carrito'}
            </button>
          )}
          <a
            href={waLink(whatsapp, waProductMessage(product))}
            target="_blank"
            rel="noreferrer"
            aria-label={`Consultar por ${product.name} por WhatsApp`}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border-2 border-petrol text-sm font-extrabold text-petrol transition hover:bg-petrol hover:text-white active:scale-[0.98]"
          >
            <Icon name="whatsapp" className="h-4 w-4" /> Consultar
          </a>
        </div>
      </div>
    </motion.article>
  );
}

/** Card "esqueleto" mientras cargan los productos */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-3xl bg-white p-2 shadow-card" aria-hidden="true">
      <div className="aspect-square rounded-[1.35rem] bg-sky-light" />
      <div className="space-y-2 px-1.5 pb-1 pt-3">
        <div className="h-3.5 w-11/12 rounded-full bg-sky-light" />
        <div className="h-3.5 w-2/3 rounded-full bg-sky-light" />
        <div className="h-5 w-1/2 rounded-full bg-sky-light" />
        <div className="h-10 rounded-2xl bg-sky-light/70" />
      </div>
    </div>
  );
}
