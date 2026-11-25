import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore, cartCount } from '../../store/useCartStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { confirmAction } from '../../utils/alerts';
import Icon from '../ui/Icon';
import Logo from './Logo';
import SearchBar from './SearchBar';

export default function Navbar() {
  const items = useCartStore((s) => s.items);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const { customer, logout } = useCustomerStore();
  const count = cartCount(items);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(false);

  // Al bajar, el header se compacta (en celular se esconde la fila del logo)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "Rebote" del carrito cada vez que cambia la cantidad
  useEffect(() => {
    if (!count) return undefined;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [count]);

  const onLogout = async () => {
    if (await confirmAction('¿Cerrar sesión?', 'Tu carrito se mantiene guardado.', 'Cerrar sesión')) logout();
  };

  const linkCls = ({ isActive }) => `text-sm font-bold transition ${isActive ? 'text-bubblegum' : 'text-petrol-dark hover:text-bubblegum'}`;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_6px_20px_-12px_rgba(30,79,97,0.35)]">
      <div className={`container-page flex items-center justify-center gap-3 transition-all duration-300 md:justify-start md:gap-5 ${scrolled ? 'max-md:max-h-0 max-md:overflow-hidden max-md:py-0 max-md:opacity-0 md:pb-2 md:pt-3' : 'max-h-28 pb-1 pt-6 md:pb-3 md:pt-6'}`}>
        {/* En celular el menú está en la barra de abajo (MobileNav) */}
        <Link to="/" className="flex shrink-0 items-center" aria-label="El Emporio de la Golosina — inicio">
          <Logo variant="main" className={`w-auto max-w-[170px] text-xl transition-all duration-300 md:max-w-[230px] md:text-2xl ${scrolled ? 'h-11 md:h-11' : 'h-11 md:h-14'}`} />
        </Link>

        <SearchBar className="hidden flex-1 md:block" />

        <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label="Principal">
          <NavLink to="/catalogo" className={linkCls}>Catálogo</NavLink>
          <NavLink to="/promociones" className={linkCls}>Promociones</NavLink>
          <NavLink to="/mis-pedidos" className={linkCls}>Mis pedidos</NavLink>
        </nav>

        <div className="ml-auto hidden items-center gap-1 md:ml-0 md:flex md:gap-2">
          {customer ? (
            <div className="hidden items-center md:flex">
              <span className="flex items-center gap-1.5 text-sm font-bold text-petrol-dark">
                <Icon name="user" className="h-5 w-5" />
                {customer.name.split(' ')[0]}
              </span>
              <button type="button" onClick={onLogout} className="rounded-full p-2 text-gray-500 hover:bg-sky-light hover:text-petrol" aria-label="Cerrar sesión" title="Cerrar sesión">
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/ingresar" className="hidden items-center gap-1.5 rounded-full px-2 py-2 text-sm font-bold text-petrol-dark hover:text-bubblegum md:flex">
              <Icon name="user" className="h-5 w-5" /> Ingresar
            </Link>
          )}

          <button type="button" onClick={openDrawer} className={`relative grid h-11 w-11 place-items-center rounded-full bg-bubblegum text-white shadow-[0_8px_18px_-8px_rgba(206,84,135,0.9)] transition hover:scale-105 hover:bg-bubblegum-light ${bump ? 'scale-125' : ''}`} aria-label={`Carrito (${count})`}>
            <Icon name="cart" className="h-5 w-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-petrol-dark px-1 text-[11px] font-extrabold text-white">
                  {count > 99 ? '99+' : count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Celular (como en la referencia): buscador + carrito en la misma fila */}
      <div className={`container-page flex items-center gap-2 pb-3 md:hidden ${scrolled ? 'pt-3' : ''}`}>
        <SearchBar className="min-w-0 flex-1" placeholder="Buscar…" />
        <button type="button" onClick={openDrawer} className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-bubblegum text-white shadow-[0_8px_18px_-8px_rgba(206,84,135,0.9)] transition-transform ${bump ? 'scale-125' : ''}`} aria-label={`Carrito (${count})`}>
          <Icon name="cart" className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-petrol-dark px-1 text-[11px] font-extrabold text-white">{count > 99 ? '99+' : count}</span>
          )}
        </button>
      </div>

    </header>
  );
}
