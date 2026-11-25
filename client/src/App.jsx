import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useCustomerStore } from './store/useCustomerStore';
import { useAdminStore } from './store/useAdminStore';
import PublicLayout from './components/layout/PublicLayout';
import { PageLoader } from './components/ui';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Promotions from './pages/Promotions';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import OrderConfirmed from './pages/OrderConfirmed';
import MyOrders, { MyOrderDetail } from './pages/MyOrders';
import NotFound from './pages/NotFound';

// El panel admin se carga aparte (no pesa en el sitio público; incluye SheetJS)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const ProductImport = lazy(() => import('./pages/admin/ProductImport'));
const ProductPhotos = lazy(() => import('./pages/admin/ProductPhotos'));
const AdminPromotions = lazy(() => import('./pages/admin/Promotions'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminSuppliers = lazy(() => import('./pages/admin/Suppliers'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

/** Redirección permanente que conserva los filtros (?q=…&pagina=…) */
function RedirectTo({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

/** Guard de cliente: si no está logueado, lo manda a /ingresar y vuelve después */
function RequireCustomer() {
  const token = useCustomerStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Guard de admin */
function RequireAdmin() {
  const token = useAdminStore((s) => s.token);
  if (!token) return <Navigate to="/ingresar?modo=admin" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalog />} />
          {/* Nombre anterior de "Variedades" (links viejos) */}
          <Route path="catalogo/articulos-varios" element={<RedirectTo to="/catalogo/variedades" />} />
          <Route path="catalogo/:categoria" element={<Catalog />} />
          <Route path="producto/:slug" element={<ProductDetail />} />
          <Route path="promociones" element={<Promotions />} />
          <Route path="carrito" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="ingresar" element={<Login />} />
          <Route element={<RequireCustomer />}>
            <Route path="mis-pedidos" element={<MyOrders />} />
            <Route path="mis-pedidos/:orderNumber" element={<MyOrderDetail />} />
            <Route path="pedido-confirmado/:orderNumber" element={<OrderConfirmed />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* El acceso de administradores está en /ingresar (pestaña "Soy administrador") */}
        <Route path="admin/login" element={<Navigate to="/ingresar?modo=admin" replace />} />
        <Route path="admin" element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="productos/importar" element={<ProductImport />} />
            <Route path="productos/fotos" element={<ProductPhotos />} />
            <Route path="promociones" element={<AdminPromotions />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="proveedores" element={<AdminSuppliers />} />
            <Route path="clientes" element={<AdminCustomers />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="configuracion" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
