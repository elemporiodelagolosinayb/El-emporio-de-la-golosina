import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { formatPrice, hasPrice, tracksStock } from '../utils/format';
import { waLink, waProductMessage } from '../utils/whatsapp';
import { useSettingsStore } from '../store/useSettingsStore';
import { SHIPPING_TEXT } from '../utils/texts';
import ProductPhoto from '../components/catalog/ProductPhoto';
import ProductCard, { useAddProduct, ProductCardSkeleton } from '../components/catalog/ProductCard';
import SectionHeader from '../components/catalog/SectionHeader';
import { useCartStore } from '../store/useCartStore';
import StockBadge from '../components/catalog/StockBadge';
import { EmptyState, Icon, PageLoader, QuantityInput } from '../components/ui';

/** "También te puede interesar": otros productos de la misma categoría */
function Related({ product }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!product.category?.slug) return setItems([]);
    let alive = true;
    api
      .get('/products', { params: { category: product.category.slug, limit: 6, inStock: 'true' } })
      .then(({ data }) => alive && setItems(data.items.filter((p) => p._id !== product._id).slice(0, 5)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [product._id, product.category?.slug]);

  if (items && !items.length) return null;
  return (
    <section className="mt-14">
      <SectionHeader icon={product.category?.icon || '🍬'} eyebrow={product.category?.name} title="También te puede interesar" to={`/catalogo/${product.category?.slug}`} linkLabel="Ver más" />
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {(items || Array.from({ length: 5 }, (_, i) => ({ _id: `sk-${i}` }))).map((p) => (
          <div key={p._id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-auto">
            {items ? <ProductCard product={p} /> : <ProductCardSkeleton />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Detail({ product }) {
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  const { addToCart, inCart, available } = useAddProduct(product);
  const priced = hasPrice(product);
  const tracked = tracksStock(product);
  const out = false; // sin stock cargado se vende "a confirmar"
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);
  const consult = waLink(whatsapp, waProductMessage(product));
  useTitle(product.name);

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500" aria-label="Ubicación">
        <button type="button" onClick={() => navigate(-1)} className="mr-2 flex items-center gap-1 font-bold text-petrol hover:text-bubblegum">
          <Icon name="chevronLeft" className="h-4 w-4" /> Volver
        </button>
        <Link to="/catalogo" className="hover:text-petrol">Catálogo</Link>
        {product.category && (
          <>
            <Icon name="chevronRight" className="h-3.5 w-3.5" />
            <Link to={`/catalogo/${product.category.slug}`} className="hover:text-petrol">{product.category.name}</Link>
          </>
        )}
      </nav>
      <div className="grid gap-6 rounded-3xl border border-petrol/10 bg-white p-4 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="aspect-square overflow-hidden rounded-2xl border border-petrol/5 bg-white">
          {product.image?.url ? <ProductPhoto url={product.image.url} alt={product.name} width={900} lazy={false} pad="p-3" /> : <div className="grid h-full place-items-center bg-sky-light/60 text-8xl">🍬</div>}
        </div>
        <div className="flex flex-col">
          {product.supplier?.name && (
            <Link to={`/catalogo?proveedor=${product.supplier.slug}`} className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-400 hover:text-bubblegum">
              {product.supplier.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl leading-tight text-petrol-dark md:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tracked ? <StockBadge stock={product.stock} /> : <span className="badge bg-sky-light text-petrol">Disponibilidad a confirmar</span>}
            {product.code && <span className="text-xs font-semibold text-gray-500">Cód. {product.code}</span>}
          </div>
          {priced && product.discountPercent > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="badge bg-bubblegum px-3 py-1 text-sm text-white">-{product.discountPercent}%</span>
              {product.promo?.occasion && <span className="badge bg-bubblegum/10 px-3 py-1 text-sm text-bubblegum">{product.promo.occasion}</span>}
              <Link to={`/catalogo?promo=${product.promo._id}`} className="text-sm font-bold text-bubblegum hover:underline">{product.promo.title}</Link>
            </div>
          )}
          {priced ? (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <p className="text-4xl font-black text-bubblegum md:text-5xl">{formatPrice(product.finalPrice ?? product.price)}</p>
                {product.discountPercent > 0 && <p className="text-xl font-bold text-gray-400 line-through">{formatPrice(product.price)}</p>}
              </div>
              <p className="text-sm text-gray-500">Precio mayorista por unidad de venta</p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-3xl font-bold text-petrol md:text-4xl">Consultar precio</p>
              <p className="text-sm text-gray-500">Hacé el pedido y te confirmamos el precio mayorista por WhatsApp.</p>
            </>
          )}
          {product.description && <p className="mt-5 whitespace-pre-line text-gray-700">{product.description}</p>}

          <ul className="mt-6 space-y-2 rounded-2xl bg-sky-light/60 p-4 text-sm text-petrol-dark">
            <li className="flex items-center gap-2"><Icon name="bank" className="h-4 w-4 text-bubblegum" /> Pagás por transferencia bancaria</li>
            <li className="flex items-center gap-2"><Icon name="truck" className="h-4 w-4 text-bubblegum" /> {SHIPPING_TEXT}</li>
          </ul>

          <div className="mt-auto space-y-3 pt-6">
            {!out && (
              <div className="flex items-center gap-3">
                <QuantityInput value={qty} onChange={setQty} max={tracked ? Math.max(1, available) : 999} />
                {tracked && <span className="text-sm text-gray-500">Disponibles: {product.stock}</span>}
              </div>
            )}
            <button type="button" className="btn-buy w-full py-3 text-lg" disabled={out || available <= 0} onClick={() => addToCart(qty)}>
              <Icon name="cart" /> {available <= 0 ? 'Ya tenés el máximo en el carrito' : 'Comprar'}
            </button>
            {inCart > 0 && (
              <button type="button" onClick={openDrawer} className="btn-outline w-full">
                Ver pedido ({inCart} en el carrito)
              </button>
            )}
            <a href={consult} target="_blank" rel="noreferrer" className="btn-outline w-full py-3">
              <Icon name="whatsapp" /> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <Related product={product} />

      {/* Barra fija de compra (celular): precio + agregar siempre a mano */}
      {available > 0 && (
        <div className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-3 right-20 z-[58] flex items-center gap-3 rounded-2xl bg-white p-2.5 pl-4 shadow-[0_14px_30px_-12px_rgba(30,79,97,0.55)] ring-1 ring-petrol/10 md:hidden">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] font-bold text-gray-500">{product.name}</p>
            <p className="font-display text-lg font-bold text-petrol-dark">{priced ? formatPrice(product.finalPrice ?? product.price) : 'A confirmar'}</p>
          </div>
          <button type="button" className="flex h-11 items-center gap-2 rounded-xl bg-bubblegum px-4 text-sm font-extrabold text-white disabled:opacity-50" disabled={available <= 0} onClick={() => addToCart(qty)}>
            <Icon name="cart" className="h-4 w-4" /> {available <= 0 ? 'Máximo' : `Comprar ${qty > 1 ? `(${qty})` : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, product: null });

  useEffect(() => {
    setState({ loading: true, product: null });
    api
      .get(`/products/${slug}`)
      .then(({ data }) => setState({ loading: false, product: data.item }))
      .catch(() => setState({ loading: false, product: null }));
  }, [slug]);

  if (state.loading) return <PageLoader />;
  if (!state.product)
    return (
      <EmptyState title="Producto no disponible">
        <Link to="/catalogo" className="btn-primary mt-3">
          Ir al catálogo
        </Link>
      </EmptyState>
    );
  return <Detail product={state.product} />;
}
