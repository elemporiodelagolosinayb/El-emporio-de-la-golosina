import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useAdminStore } from '../../store/useAdminStore';
import { adminUserSchema, applyServerErrors } from '../../schemas';
import { errorMessage, formatDate } from '../../utils/format';
import { confirmDelete, notifySuccess, alertError } from '../../utils/alerts';
import { PageHeader } from '../../components/admin';
import { Field, Icon, Input, Modal, Pagination, Spinner } from '../../components/ui';
import { usePaged } from '../../hooks/usePaged';

function UserForm({ open, user, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const { register, handleSubmit, reset, setError, formState } = useForm({ resolver: zodResolver(adminUserSchema(isEdit)) });
  useEffect(() => {
    if (open) reset({ name: user?.name || '', email: user?.email || '', password: '' });
  }, [open, user, reset]);

  const onSubmit = async (v) => {
    try {
      if (isEdit) await api.put(`/admin/users/${user._id}`, v);
      else await api.post('/admin/users', v);
      notifySuccess('Guardado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) alertError(errorMessage(err));
    }
  };

  const e = formState.errors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar administrador' : 'Nuevo administrador'}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-buy" onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting}>Guardar</button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field label="Nombre" error={e.name?.message}><Input error={e.name} {...register('name')} /></Field>
        <Field label="Correo electrónico" error={e.email?.message}><Input type="email" error={e.email} {...register('email')} /></Field>
        <Field label={isEdit ? 'Nueva contraseña (dejar vacío para no cambiarla)' : 'Contraseña'} error={e.password?.message} hint="Mínimo 8 caracteres">
          <Input type="password" autoComplete="new-password" error={e.password} {...register('password')} />
        </Field>
      </form>
    </Modal>
  );
}

export default function Users() {
  const me = useAdminStore((s) => s.admin);
  const { data, loading, reload } = useApi('/admin/users');
  const [form, setForm] = useState({ open: false, user: null });
  const items = data?.items || [];
  const paged = usePaged(items, 10);

  const remove = async (u) => {
    if (!(await confirmDelete(`al administrador ${u.name}`))) return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      notifySuccess('Administrador eliminado');
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Administradores" subtitle="Usuarios con acceso al panel">
        <button type="button" className="btn-buy btn-sm" onClick={() => setForm({ open: true, user: null })}><Icon name="plus" className="h-4 w-4" /> Nuevo admin</button>
      </PageHeader>
      {loading && !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Alta</th><th /></tr></thead>
            <tbody>
              {paged.items.map((u) => {
                const isMe = String(u._id) === String(me?.id);
                const canDelete = !isMe && items.length > 1;
                return (
                  <tr key={u._id}>
                    <td className="font-bold">{u.name} {isMe && <span className="badge bg-sky-light text-petrol-dark">Vos</span>}</td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light" title="Editar" onClick={() => setForm({ open: true, user: u })}><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="rounded-full p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={!canDelete} title={canDelete ? 'Eliminar' : 'No podés eliminarte ni eliminar al último admin'} onClick={() => remove(u)}><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={paged.page} pages={paged.pages} onChange={paged.setPage} />
      <UserForm open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} onSaved={reload} />
    </div>
  );
}
