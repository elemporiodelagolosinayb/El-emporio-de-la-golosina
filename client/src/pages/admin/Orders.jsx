import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks';
import { formatPrice, formatDateTime, ORDER_STATUS, errorMessage } from '../../utils/format';
import { formatPhone } from '../../utils/phone';
import { waLink } from '../../utils/whatsapp';
import swal, { notifySuccess, alertError } from '../../utils/alerts';
import { PageHeader, SearchInput, WhatsAppButton } from '../../components/admin';
import { StatusBadge, OrderItems } from '../MyOrders';
import { EmptyState, Field, Icon, Input, Modal, Pagination, Select, Spinner, Textarea } from '../../components/ui';

const FLOW = ['pendiente_pago', 'pago_confirmado', 'en_preparacion', 'entregado'];

function OrderDetail({ id, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setOrder(null);
    api.get(`/admin/orders/${id}`).then(({ data }) => {
      setOrder(data.order);
      setNotes(data.order.internalNotes || '');
    });
  }, [id]);

  const changeStatus = async (status) => {
    if (status === 'cancelado') {
      const r = await swal.fire({
        icon: 'warning',
        title: `¿Cancelar el pedido ${order.orderNumber}?`,
        text: 'Se devolverá el stock automáticamente. Un pedido cancelado no se puede reactivar.',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar pedido',
        cancelButtonText: 'Volver',
      });
      if (!r.isConfirmed) return;
    }
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/status`, { status });
      setOrder(data.order);
      onChanged();
      notifySuccess(`Estado: ${ORDER_STATUS[status].label}`);
    } catch (err) {
      alertError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** El negocio vio la transferencia en el banco: deja de figurar "a verificar" */
  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/verify`);
      setOrder(data.order);
      onChanged();
      notifySuccess('Pago verificado');
    } catch (err) {
      alertError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/notes`, { internalNotes: notes });
      setOrder(data.order);
      notifySuccess('Notas guardadas');
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const remove = async () => {
    const wasCancelled = order.status === 'cancelado';
    const r = await swal.fire({
      icon: 'warning',
      title: `¿Seguro que querés eliminar el pedido ${order.orderNumber}?`,
      html: `Esta acción no se puede deshacer.${wasCancelled ? '' : '<br><br>El pedido no está cancelado: ¿querés devolver el stock de sus productos?'}`,
      showCancelButton: true,
      showDenyButton: !wasCancelled,
      confirmButtonText: wasCancelled ? 'Sí, eliminar' : 'Eliminar y devolver stock',
      denyButtonText: 'Eliminar sin devolver stock',
      denyButtonColor: '#6b7280',
      cancelButtonText: 'Cancelar',
    });
    if (r.isDismissed) return;
    try {
      await api.delete(`/admin/orders/${order._id}`, { params: { restoreStock: r.isConfirmed && !wasCancelled } });
      notifySuccess('Pedido eliminado');
      onChanged();
      onClose();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const cancelled = order?.status === 'cancelado';

  return (
    <Modal open={Boolean(id)} onClose={onClose} title={order ? `Pedido ${order.orderNumber}` : 'Pedido'} size="max-w-3xl">
      {!order ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
              <p className="text-lg font-extrabold">{order.customerSnapshot.name}</p>
              <p className="text-sm">{formatPhone(order.customerSnapshot.phone)}</p>
              {!order.customer && <p className="text-xs text-gray-400">(cliente eliminado — datos del pedido)</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={order.status} />
              <a
                href={waLink(order.customerSnapshot.phone, `¡Hola ${order.customerSnapshot.name}! Te escribimos de El Emporio de la Golosina por tu pedido ${order.orderNumber}.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-wa btn-sm"
              >
                <Icon name="whatsapp" className="h-4 w-4" /> Contactar cliente
              </a>
            </div>
          </div>


          {order.autoConfirmed && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-l-4 border-candy-gold bg-yellow-100 p-3 text-sm">
              <span>
                <b>Pago confirmado automáticamente</b> cuando el cliente envió el comprobante por WhatsApp. Revisá en Santander que haya llegado la transferencia.
              </span>
              <span className="flex gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={verify} disabled={busy}>Ya lo verifiqué</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => changeStatus('pendiente_pago')} disabled={busy}>No llegó</button>
              </span>
            </div>
          )}

          <OrderItems items={order.items} />
          <p className="text-right text-2xl font-black">
            Total: <span className="text-bubblegum">{formatPrice(order.total)}</span>
            {order.pricePending && <span className="block text-xs font-bold text-petrol">+ productos con precio a confirmar</span>}
          </p>
          {order.notes && (
            <p className="rounded-xl border-l-4 border-candy-gold bg-cream p-3 text-sm">
              <b>Observaciones del cliente:</b> {order.notes}
            </p>
          )}

          <div>
            <p className="label">Cambiar estado</p>
            {cancelled ? (
              <p className="text-sm text-gray-500">Pedido cancelado {order.stockRestored && '· stock devuelto'}.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {FLOW.map((s) => (
                  <button key={s} type="button" disabled={busy || order.status === s} onClick={() => changeStatus(s)} className={`chip ${order.status === s ? 'border-petrol bg-petrol text-white' : 'border-sky-light text-petrol hover:border-sky'}`}>
                    {ORDER_STATUS[s].label}
                  </button>
                ))}
                <button type="button" disabled={busy} onClick={() => changeStatus('cancelado')} className="chip border-red-200 text-red-600 hover:bg-red-50">
                  Cancelar pedido
                </button>
              </div>
            )}
          </div>

          <Field label="Notas internas (solo admin)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Ej: pagó con transferencia del 12/11, enviar el jueves…" />
          </Field>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="btn-ghost btn-sm text-red-600" onClick={remove}>
              <Icon name="trash" className="h-4 w-4" /> Eliminar pedido
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={saveNotes} disabled={notes === (order.internalNotes || '')}>
              Guardar notas
            </button>
          </div>

          {order.statusHistory?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-petrol">Historial de estados</summary>
              <ul className="mt-2 space-y-1">
                {order.statusHistory.map((h, i) => (
                  <li key={i}>
                    {formatDateTime(h.date)} — {ORDER_STATUS[h.status]?.label || h.status}
                    {h.note && <span className="text-gray-500"> ({h.note})</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [page, setPage] = useState(1);
  const status = params.get('status') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const customer = params.get('customer') || '';
  const openId = params.get('open');

  const { data, loading, reload } = useApi('/admin/orders', { page, q, status, from, to, customer });

  useEffect(() => setPage(1), [q, status, from, to, customer]);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Pedidos" subtitle={data ? `${data.total} pedido(s)` : ''} />

      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_160px]">
        <SearchInput value={search} onChange={setSearch} placeholder="N.º de pedido, nombre o celular…" />
        <Select value={status} onChange={(e) => setParam('status', e.target.value)} className="py-2">
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} className="py-2" aria-label="Desde" />
        <Input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} className="py-2" aria-label="Hasta" />
        {customer && (
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            {customer && (
              <button type="button" className="chip border-petrol text-petrol" onClick={() => setParam('customer', '')}>
                Filtrado por cliente ✕
              </button>
            )}
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon="receipt" title="No hay pedidos con esos filtros" />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
                <th>Contacto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o._id} className="cursor-pointer hover:bg-cream" onClick={() => setParam('open', o._id)}>
                  <td className="font-extrabold text-petrol">
                    {o.orderNumber}
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  <td>
                    {o.customerSnapshot.name}
                    <br />
                    <span className="text-xs text-gray-500">{formatPhone(o.customerSnapshot.phone)}</span>
                  </td>
                  <td className="text-right font-bold">{formatPrice(o.total)}{o.pricePending && <span className="block text-[11px] font-bold text-petrol">+ a confirmar</span>}</td>
                  <td>
                    <StatusBadge status={o.status} />
                    {o.autoConfirmed && <span className="mt-1 block text-[11px] font-bold text-amber-700">Automático · a verificar</span>}
                  </td>
                  <td>
                    <WhatsAppButton phone={o.customerSnapshot.phone} message={`¡Hola ${o.customerSnapshot.name}! Te escribimos de El Emporio de la Golosina por tu pedido ${o.orderNumber}.`} />
                  </td>
                  <td>
                    <Icon name="chevronRight" className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />

      <OrderDetail id={openId} onClose={() => setParam('open', '')} onChanged={reload} />
    </div>
  );
}
