import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCatalogStore } from '../../store/useCatalogStore';
import { waLink, waGeneralMessage } from '../../utils/whatsapp';
import { cld } from '../../utils/cloudinary';
import Icon from '../ui/Icon';
import TopBar from './TopBar';
import Navbar from './Navbar';
import Footer from './Footer';
import PromoPopup from '../catalog/PromoPopup';
import MobileNav from './MobileNav';
import CartDrawer from '../cart/CartDrawer';
import { useCartStore, takePendingAdd } from '../../store/useCartStore';
import { useCustomerStore } from '../../store/useCustomerStore';

/** Usa el Logo 1 (circular) como favicon cuando está cargado */
export function useFavicon() {
  const logo = useSettingsStore((s) => s.settings.logoTopbar);
  useEffect(() => {
    const link = document.getElementById('favicon');
    if (!link) return;
    if (logo?.url) {
      link.type = 'image/png';
      link.href = cld(logo.url, 64);
    } else {
      link.type = 'image/svg+xml';
      link.href = '/favicon.svg';
    }
  }, [logo?.url]);
}

export default function PublicLayout() {
  const fetchSettings = useSettingsStore((s) => s.fetch);
  const fetchCatalog = useCatalogStore((s) => s.fetch);
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);
  const { pathname } = useLocation();
  // Páginas que manejan su propio ancho (fondos a pantalla completa)
  const isHome = pathname === '/' || pathname === '/ingresar';
  useFavicon();

  useEffect(() => {
    fetchSettings();
    fetchCatalog();
  }, [fetchSettings, fetchCatalog]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    useCartStore.getState().closeDrawer();
  }, [pathname]);

  // Si tocó "Comprar" sin haber ingresado: al volver ya logueado, el producto entra al carrito
  const customer = useCustomerStore((s) => s.customer);
  useEffect(() => {
    if (!customer || pathname === '/ingresar') return;
    const pending = takePendingAdd();
    if (!pending?.item) return;
    useCartStore.getState().add(pending.item, pending.quantity || 1);
    useCartStore.getState().openDrawer();
  }, [customer, pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <TopBar />
      <Navbar />
      {/* La home maneja su propio ancho (hero a pantalla completa) */}
      <main className={`flex-1 ${isHome ? '' : 'container-page pt-6 md:pt-8'}`}>
        <Outlet />
      </main>
      <Footer />
      <PromoPopup />
      <MobileNav />
      <CartDrawer />

      {/* Botón flotante de WhatsApp en todo el sitio */}
      <a
        href={waLink(whatsapp, waGeneralMessage())}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] right-3 z-40 md:bottom-5 md:right-5 grid h-14 w-14 place-items-center rounded-full bg-petrol ring-4 ring-white max-md:h-[52px] max-md:w-[52px] text-white shadow-[0_10px_25px_-8px_rgba(30,79,97,0.8)] transition hover:scale-110 hover:bg-bubblegum"
        aria-label="Escribinos por WhatsApp"
      >
        <Icon name="whatsapp" className="h-7 w-7" />
      </a>
    </div>
  );
}
