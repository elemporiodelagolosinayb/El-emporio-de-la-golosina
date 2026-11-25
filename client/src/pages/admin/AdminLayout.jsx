import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useAdminStore } from '../../store/useAdminStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useFavicon } from '../../components/layout/PublicLayout';
import Logo from '../../components/layout/Logo';
import { Icon } from '../../components/ui';

const NAV = [
  { to: '/admin', label: 'Resumen', icon: 'grid', end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: 'receipt' },
  { to: '/admin/productos', label: 'Productos', icon: 'box', end: true },
  { to: '/admin/productos/importar', label: 'Planilla (Excel)', icon: 'upload', sub: true },
  { to: '/admin/productos/fotos', label: 'Fotos masivas', icon: 'image', sub: true },
  { to: '/admin/promociones', label: 'Promociones', icon: 'tag' },
  { to: '/admin/categorias', label: 'Categorías', icon: 'sparkle' },
  { to: '/admin/proveedores', label: 'Proveedores', icon: 'truck' },
  { to: '/admin/clientes', label: 'Clientes', icon: 'users' },
  { to: '/admin/usuarios', label: 'Administradores', icon: 'key' },
  { to: '/admin/configuracion', label: 'Configuración', icon: 'settings' },
];

function Sidebar({ onNavigate }) {
  return (
    <nav className="flex h-full flex-col bg-petrol text-white">
      <Link to="/admin" className="flex items-center gap-3 px-5 py-5" onClick={onNavigate}>
        <Logo variant="topbar" className="h-11 w-11 rounded-full object-cover" />
        <span className="font-display text-lg leading-tight">
          Panel
          <br />
          <span className="text-sm opacity-80">El Emporio</span>
        </span>
      </Link>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition ${n.sub ? 'ml-4 py-2 text-sm' : ''} ${isActive ? 'bg-white text-petrol' : 'text-white/90 hover:bg-white/10'}`
            }
          >
            <Icon name={n.icon} className="h-5 w-5" />
            {n.label}
          </NavLink>
        ))}
      </div>
      <a href="/" target="_blank" rel="noreferrer" className="m-3 flex items-center justify-center gap-2 rounded-xl bg-petrol-dark px-3 py-2 text-sm font-bold hover:bg-black/20">
        <Icon name="eye" className="h-4 w-4" /> Ver tienda
      </a>
    </nav>
  );
}

export default function AdminLayout() {
  const { admin, logout, setAdmin } = useAdminStore();
  const fetchSettings = useSettingsStore((s) => s.fetch);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useFavicon();

  useEffect(() => {
    fetchSettings();
    api.get('/admin/auth/me').then(({ data }) => setAdmin(data.admin)).catch(() => {});
  }, [fetchSettings, setAdmin]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-sky-light/50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'tween' }} className="absolute inset-y-0 left-0 w-64">
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sky-light bg-white/95 px-4 py-3 backdrop-blur">
          <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light lg:hidden" onClick={() => setOpen(true)} aria-label="Menú">
            <Icon name="menu" className="h-6 w-6" />
          </button>
          <span className="ml-auto text-sm font-bold text-petrol-dark">{admin?.name}</span>
          <button type="button" onClick={logout} className="btn-ghost btn-sm" title="Cerrar sesión">
            <Icon name="logout" className="h-4 w-4" /> Salir
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
