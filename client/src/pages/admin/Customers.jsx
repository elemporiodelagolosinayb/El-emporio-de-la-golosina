import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks';
import { customerEditSchema, applyServerErrors } from '../../schemas';
import { normalizePhone, formatPhone } from '../../utils/phone';
import { formatPrice, formatDateTime, errorMessage } from '../../utils/format';
import { waLink } from '../../utils/whatsapp';
import swal, { confirmDelete, notifySuccess, alertError } from '../../utils/alerts';
import { PageHeader, SearchInput, WhatsAppButton } from '../../components/admin';
import { EmptyState, Field, Icon, Input, Modal, Pagination, Spinner } from '../../components/ui';

function EditCustomer({ customer, onClose, onSaved }) {
  const { register, handleSubmit, reset, setError, formState } = useForm({ resolver: zodResolver(customerEditSchema) });
  useEffect(() => {
    if (customer) reset({ name: customer.name, phone: customer.phone.slice(3) });
  }, [customer, reset]);

  const onSubmit = async (v) => {
    try {
      await api.put(`/admin/customers/${customer._id}`, { name: v.name, phone: normalizePhone(v.phone) });
      notifySuccess('Cliente actualizado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) alertError(errorMessage(err));
    }
  };

  return (
    <Modal
      open={Boolean(customer)}
      onClose={onClose}
      title="Editar cliente"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-buy" onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting}>Guardar</button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field label="Nombre y apellido" error={formState.errors.name?.message}><Input error={formState.errors.name} {...register('name')} /></Field>
        <Field label="Celular" error={formState.errors.phone?.message}><Input type="tel" error={formState.errors.phone} {...register('phone')} /></Field>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const { data, loading, reload } = useApi('/admin/customers', { page, q });
  useEffect(() => setPage(1), [q]);

  const resetPin = async (c) => {
    const ok = await swal.fire({ icon: 'question', title: `¿Resetear el PIN de ${c.name}?`, text: 'Se genera un PIN nuevo y el anterior deja de funcionar.', showCancelButton: true, confirmButtonText: 'Resetear PIN', cancelButtonText: 'Cancelar' });
    if (!ok.isConfirmed) return;
    try {
      const { data: res } = await api.post(`/admin/customers/${c._id}/reset-pin`);
      const msg = `¡Hola ${c.name.split(' ')[0]}! Tu nuevo PIN para ingresar a la tienda de El Emporio de la Golosina es: ${res.pin}`;
      await swal.fire({
        icon: 'success',
        title: 'PIN nuevo',
        html: `<p style="font-size:42px;font-weight:900;letter-spacing:.3em;color:#1E4F61">${res.pin}</p><p>Pasáselo al cliente por WhatsApp. No se vuelve a mostrar.</p>`,
        showCancelButton: true,
        confirmButtonText: 'Enviar por WhatsApp',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#286C84',
      }).then((r) => r.isConfirmed && window.open(waLink(c.phone, msg), '_blank'));
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const remove = async (c) => {
    if (!(await confirmDelete(`al cliente ${c.name}`, 'Sus pedidos se conservan con el nombre y celular guardados.'))) return;
    try {
      await api.delete(`/admin/customers/${c._id}`);
      notifySuccess('Cliente eliminado');
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Clientes" subtitle={data ? `${data.total} cliente(s)` : ''} />
      <div className="card mb-3 p-3"><SearchInput value={search} onChange={setSearch} placeholder="Nombre o celular…" /></div>

      {loading && !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !data?.items.length ? (
        <EmptyState icon="users" title="No hay clientes" />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Celular</th><th>Pedidos</th><th>Último pedido</th><th>Total comprado</th><th /></tr></thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id}>
                  <td className="font-bold">{c.name} {c.locked && <span className="badge bg-candy-gold text-ink">Bloqueado</span>}</td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{formatPhone(c.phone)}</span>
                      <WhatsAppButton phone={c.phone} message={`¡Hola ${c.name}! Te escribimos de El Emporio de la Golosina.`} />
                    </div>
                  </td>
                  <td><Link to={`/admin/pedidos?customer=${c._id}`} className="font-bold text-petrol hover:underline">{c.ordersCount}</Link></td>
                  <td className="whitespace-nowrap">{c.lastOrder ? formatDateTime(c.lastOrder) : '—'}</td>
                  <td>{formatPrice(c.spent)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light" title="Editar" onClick={() => setEditing(c)}><Icon name="edit" className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light" title="Resetear PIN" onClick={() => resetPin(c)}><Icon name="key" className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-red-600 hover:bg-red-50" title="Eliminar" onClick={() => remove(c)}><Icon name="trash" className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      <EditCustomer customer={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}
