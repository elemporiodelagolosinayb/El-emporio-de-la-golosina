import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '../../utils/format';
import { useCartStore, cartCount, cartTotal } from '../../store/useCartStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import Icon from '../ui/Icon';

/**
 * Barra flotante de celular (diseño propio): píldora petróleo con el carrito
 * destacado en el centro. Inicio · Catálogo · [Carrito] · Promos · Cuenta
 */
export default function MobileNav() {
  const items = useCartStore((s) => s.items);
  const drawerOpen = useCartStore((s) => s.drawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const customer = useCustomerStore((s) => s.customer);
  const { pathname } = useLocation();
  const count = cartCount(items);
  const total = cartTotal(items);
  // La píldora del pedido no aparece en el checkout ni con el panel del carrito abierto
  const showSummary = count > 0 && !drawerOpen && !['/checkout', '/carrito'].includes(pathname) && !pathname.startsWith('/pedido-confirmado') && !pathname.startsWith('/producto/');

  const cls = ({ isActive }) => `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold transition ${isActive ? 'text-white' : 'text-white/60'}`;
  const Dot = ({ on }) => <span className={`absolute -bottom-0.5 h-1 w-1 rounded-full bg-candy-gold transition ${on ? 'opacity-100' : 'opacity-0'}`} />;

  const Item = ({ to, icon, label, end }) => (
    <NavLink to={to} end={end} className={cls}>
      {({ isActive }) => (
        <>
          <Icon name={icon} className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.9} />
          <span className="max-w-[4.5rem] truncate">{label}</span>
          <Dot on={isActive} />
        </>
      )}
    </NavLink>
  );

  return (
    <>
    {/* Resumen del pedido siempre a mano (celular) */}
    <AnimatePresence>
      {showSummary && (
        <motion.button
          type="button"
          onClick={openDrawer}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-3 right-20 z-[59] flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-left shadow-[0_14px_30px_-12px_rgba(30,79,97,0.55)] ring-1 ring-petrol/10 md:hidden [@media(max-height:720px)]:hidden"
          aria-label={`Ver pedido: ${count} productos, ${formatPrice(total)}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bubblegum/10 text-bubblegum">
            <Icon name="cart" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[11px] font-bold text-gray-500">{count} producto{count === 1 ? '' : 's'} en tu pedido</span>
            <motion.span key={total} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="block font-display text-lg font-bold text-petrol-dark">
              {formatPrice(total)}
            </motion.span>
          </span>
          <span className="flex items-center gap-0.5 text-sm font-extrabold text-bubblegum">
            Ver <Icon name="chevronRight" className="h-4 w-4" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
    <nav aria-label="Navegación" className="fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-[60] flex items-center rounded-full bg-petrol-dark/95 px-2 py-1 shadow-[0_14px_30px_-10px_rgba(30,79,97,0.7)] backdrop-blur md:hidden">
      <Item to="/" end icon="home" label="Inicio" />
      <Item to="/catalogo" icon="grid" label="Catálogo" />

      {/* Carrito destacado en el centro */}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={openDrawer}
          aria-label={`Carrito (${count})`}
          className={`relative -mt-7 grid h-14 w-14 place-items-center rounded-full bg-bubblegum text-white shadow-[0_10px_22px_-6px_rgba(206,84,135,0.9)] ring-4 ring-cream transition active:scale-95 ${drawerOpen || pathname === '/carrito' ? 'scale-105' : ''}`}
        >
          <Icon name="cart" className="h-6 w-6" strokeWidth={2.2} />
          {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-candy-gold px-1 text-[10px] font-extrabold text-ink ring-2 ring-white">{count > 99 ? '99+' : count}</span>}
        </button>
      </div>

      <Item to="/promociones" icon="tag" label="Promos" />
      <Item to={customer ? '/mis-pedidos' : '/ingresar'} icon="user" label={customer ? customer.name.split(' ')[0] : 'Cuenta'} />
    </nav>
    </>
  );
}
