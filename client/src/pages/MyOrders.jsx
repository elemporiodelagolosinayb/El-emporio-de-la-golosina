import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { confirmAction } from '../utils/alerts';
import { formatPrice, itemPrice, formatDateTime, ORDER_STATUS } from '../utils/format';
import { waLink, waProofMessage, markReceiptSent } from '../utils/whatsapp';
import { EmptyState, Icon, PageLoader, Pagination } from '../components/ui';

export const StatusBadge = ({ status }) => {
  const s = ORDER_STATUS[status] || { label: status, cls: 'bg-gray-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

export function OrderItems({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Cant.</th>
            <th>Producto</th>
            <th className="text-right">P. unit.</th>
            <th className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx}>
              <td className="font-extrabold text-petrol">{i.quantity}</td>
              <td>
                {i.name} {i.type === 'promotion' && <span className="badge bg-bubblegum-light text-white">PROMO</span>}
                {i.discountPercent > 0 && <span className="badge ml-1 bg-bubblegum text-white">-{i.discountPercent}%</span>}
                {i.promotionTitle && <span className="block text-xs text-bubblegum">{i.promotionTitle}</span>}
              </td>
              <td className="text-right">
                {i.discountPercent > 0 && i.listPrice > i.unitPrice && <span className="block text-xs text-gray-400 line-through">{formatPrice(i.listPrice)}</span>}
                {itemPrice(i.unitPrice)}
              </td>
              <td className="text-right font-bold">{i.priceToConfirm ? '—' : formatPrice(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** /mis-pedidos */
export default function MyOrders() {
  useTitle('Mis pedidos', { noindex: true });
  const { customer, logout } = useCustomerStore();
  const onLogout = async () => {
    if (await confirmAction('¿Cerrar sesión?', 'Tu carrito se mantiene guardado.', 'Cerrar sesión')) logout();
  };
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, items: [], pages: 1 });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    api
      .get('/orders/mine', { params: { page } })
      .then(({ data }) => setState({ loading: false, items: data.items, pages: data.pages }))
      .catch(() => setState({ loading: false, items: [], pages: 1 }));
  }, [page]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl text-petrol">Mis pedidos</h1>
          {customer && <p className="text-sm text-gray-500">Hola, {customer.name.split(' ')[0]}</p>}
        </div>
        <button type="button" onClick={onLogout} className="btn-ghost btn-sm text-gray-500">
          <Icon name="logout" className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
      {state.loading ? (
        <PageLoader />
      ) : !state.items.length ? (
        <EmptyState icon="receipt" title="Todavía no hiciste pedidos">
          <Link to="/catalogo" className="btn-buy mt-4">
            Ir al catálogo
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {state.items.map((o) => (
            <li key={o._id}>
              {/* Celular: número y fecha arriba, estado y total abajo (sin cortar el número de pedido) */}
              <Link to={`/mis-pedidos/${o.orderNumber}`} className="card flex items-center gap-3 p-4 transition hover:shadow-soft">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 sm:flex-1">
                    <p className="whitespace-nowrap font-extrabold text-petrol-dark">{o.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(o.createdAt)} · {o.items.length} producto{o.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3">
                    <StatusBadge status={o.status} />
                    <span className="whitespace-nowrap text-lg font-black">
                      {formatPrice(o.total)}
                      {o.pricePending && <span className="ml-1 text-xs font-bold text-petrol">+ a confirmar</span>}
                    </span>
                  </div>
                </div>
                <Icon name="chevronRight" className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={state.pages} onChange={setPage} />
    </div>
  );
}

/** /mis-pedidos/:orderNumber */
export function MyOrderDetail() {
  const { orderNumber } = useParams();
  useTitle(`Pedido ${orderNumber}`, { noindex: true });
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);
  const [state, setState] = useState({ loading: true, order: null });

  useEffect(() => {
    api
      .get(`/orders/mine/${orderNumber}`)
      .then(({ data }) => setState({ loading: false, order: data.order }))
      .catch(() => setState({ loading: false, order: null }));
  }, [orderNumber]);

  if (state.loading) return <PageLoader />;
  const o = state.order;
  if (!o) return <EmptyState title="Pedido no encontrado" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/mis-pedidos" className="btn-ghost btn-sm -ml-2">
        <Icon name="chevronLeft" className="h-4 w-4" /> Mis pedidos
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl text-petrol-dark">Pedido {o.orderNumber}</h1>
            <p className="text-sm text-gray-500">{formatDateTime(o.createdAt)}</p>
          </div>
          <StatusBadge status={o.status} />
        </div>
        <div className="mt-4">
          <OrderItems items={o.items} />
        </div>
        <p className="mt-3 text-right text-2xl font-black">
          Total: <span className="text-bubblegum">{formatPrice(o.total)}</span>
          {o.pricePending && <span className="block text-xs font-bold text-petrol">+ productos con precio a confirmar</span>}
        </p>
        {o.notes && (
          <p className="mt-3 rounded-xl border-l-4 border-candy-gold bg-cream p-3 text-sm">
            <b>Observaciones:</b> {o.notes}
          </p>
        )}
        {o.status === 'pendiente_pago' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/pedido-confirmado/${o.orderNumber}`} state={{ order: o }} className="btn-outline btn-sm">
              Ver datos de transferencia
            </Link>
            <a
              href={waLink(whatsapp, waProofMessage(o))}
              target="_blank"
              rel="noreferrer"
              onClick={async () => {
                const updated = await markReceiptSent(o);
                if (updated) setState({ loading: false, order: updated });
              }}
              className="btn-wa btn-sm"
            >
              <Icon name="whatsapp" className="h-4 w-4" /> {o.pricePending ? 'Pedir el total' : 'Enviar comprobante'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
