import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { formatPrice, formatDate, formatDateTime } from '../../utils/format';
import { PageHeader, StatCard } from '../../components/admin';
import { StatusBadge } from '../MyOrders';
import { Icon, PageLoader } from '../../components/ui';

function StockList({ title, items, tone, empty }) {
  return (
    <div className="card min-w-0 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg text-petrol-dark">
        <span className={`h-3 w-3 rounded-full ${tone}`} /> {title}
      </h2>
      {!items.length ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-sky-light text-sm">
          {items.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate">
                {p.name} {p.code && <span className="text-xs text-gray-400">({p.code})</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-extrabold">{p.stock} u.</span>
                <Link to={`/admin/productos?edit=${p._id}`} className="rounded-full p-1 text-petrol hover:bg-sky-light" title="Editar">
                  <Icon name="edit" className="h-4 w-4" />
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useApi('/admin/dashboard');
  if (loading || !data) return <PageLoader />;
  const { orders, stock, promotions, threshold } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Resumen" subtitle="Cómo viene el día en la tienda" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Pedidos de hoy · ${formatPrice(orders.todayTotal)}`} value={orders.today} icon="receipt" tone="petrol" to="/admin/pedidos" />
        <StatCard label="Pendientes de pago" value={orders.pendingPayment} icon="bank" tone="gold" to="/admin/pedidos?status=pendiente_pago" />
        <StatCard label="Para preparar / entregar" value={orders.inPreparation} icon="truck" tone="mint" to="/admin/pedidos?status=en_preparacion" />
        <StatCard label="Productos sin foto" value={stock.noImageCount} icon="image" tone="sky" to="/admin/productos?noImage=true" />
      </div>

      {stock.reviewCount > 0 && (
        <Link to="/admin/productos?needsReview=true" className="flex items-center gap-3 rounded-2xl border-l-4 border-candy-gold bg-yellow-100 p-4 font-bold text-ink">
          <span aria-hidden="true">⚠️</span> Productos para revisar: {stock.reviewCount}
          <span className="ml-auto text-sm text-petrol">Ver →</span>
        </Link>
      )}


      {/* Stock 0 = disponibilidad a confirmar (no se muestra como "sin stock"); solo se avisa del stock cargado que se está acabando */}
      <StockList title={`Stock bajo: ${threshold} unidades o menos (${stock.lowCount})`} items={stock.lowStock} tone="bg-candy-gold" empty="Ningún producto con stock cargado se está quedando sin unidades." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card min-w-0 p-4">
          <h2 className="mb-3 text-lg text-petrol-dark">Promos vigentes</h2>
          {!promotions.active.length ? (
            <p className="text-sm text-gray-500">No hay promos vigentes.</p>
          ) : (
            <ul className="divide-y divide-sky-light text-sm">
              {promotions.active.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-2 py-2">
                  <span>{p.title}</span>
                  <span className={`badge ${p.endingSoon ? 'bg-candy-gold text-ink' : 'bg-mint text-petrol-dark'}`}>
                    {p.endingSoon ? 'Vence pronto · ' : 'Hasta '}
                    {formatDate(p.endDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {promotions.upcoming.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-extrabold text-gray-500">Programadas</h3>
              <ul className="text-sm">
                {promotions.upcoming.map((p) => (
                  <li key={p._id} className="py-1">
                    {p.title} — desde {formatDate(p.startDate)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg text-petrol-dark">Últimos pedidos</h2>
            <Link to="/admin/pedidos" className="text-sm font-bold text-bubblegum hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-sky-light text-sm">
            {orders.latest.map((o) => (
              <li key={o._id}>
                <Link to={`/admin/pedidos?open=${o._id}`} className="flex items-center justify-between gap-2 py-2 hover:text-petrol">
                  <span className="min-w-0">
                    <b>{o.orderNumber}</b> · {o.customerSnapshot.name}
                    <br />
                    <span className="text-xs text-gray-500">{formatDateTime(o.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={o.status} />
                    <b>{formatPrice(o.total)}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
