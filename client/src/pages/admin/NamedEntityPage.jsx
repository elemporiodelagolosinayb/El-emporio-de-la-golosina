import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { namedEntitySchema, applyServerErrors } from '../../schemas';
import { normalizeText } from '../../utils/text';
import { cld } from '../../utils/cloudinary';
import { errorMessage } from '../../utils/format';
import swal, { confirmDelete, notifySuccess, alertError } from '../../utils/alerts';
import { PageHeader, SearchInput, ImageUploader } from '../../components/admin';
import { EmptyState, Field, Icon, Input, Modal, Pagination, Spinner, Toggle } from '../../components/ui';

const PER_PAGE = 20;

/**
 * CRUD genérico para Categorías y Proveedores.
 * cfg: { title, endpoint, singular, hasIcon, hasLogo, allowNone, productFilterKey }
 */
export default function NamedEntityPage({ cfg }) {
  const { data, loading, reload, setData } = useApi(`/admin/${cfg.endpoint}`);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, item: null });
  const items = data?.items || [];

  const filtered = useMemo(() => {
    const t = normalizeText(search);
    return t ? items.filter((i) => normalizeText(i.name).includes(t)) : items;
  }, [items, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => setPage(1), [search]);

  /** Reordenar con flechas (sobre la lista completa) */
  const move = async (item, dir) => {
    const list = [...items];
    const idx = list.findIndex((x) => x._id === item._id);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setData({ ...data, items: list });
    try {
      await api.put(`/admin/${cfg.endpoint}/reorder`, { ids: list.map((x) => x._id) });
    } catch (err) {
      alertError(errorMessage(err));
      reload();
    }
  };

  const toggle = async (item) => {
    try {
      await api.patch(`/admin/${cfg.endpoint}/${item._id}/toggle`);
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  /**
   * Eliminar: si tiene productos, obliga a reasignarlos (o dejarlos sin proveedor)
   * u ofrece desactivar en lugar de eliminar.
   */
  const remove = async (item) => {
    let reassignTo;
    if (item.productCount > 0) {
      const options = Object.fromEntries(items.filter((x) => x._id !== item._id).map((x) => [x._id, x.name]));
      if (cfg.allowNone) options.none = `— Dejar sin ${cfg.singular} —`;
      const r = await swal.fire({
        icon: 'warning',
        title: `"${item.name}" tiene ${item.productCount} producto(s)`,
        html: `Para eliminarla/o, elegí a qué ${cfg.singular} reasignar sus productos.<br>O desactivala/o para ocultarla sin borrar nada.`,
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Reasignar productos a…',
        showCancelButton: true,
        showDenyButton: item.active,
        confirmButtonText: 'Reasignar y eliminar',
        denyButtonText: 'Desactivar en su lugar',
        denyButtonColor: '#286C84',
        cancelButtonText: 'Cancelar',
        inputValidator: (v) => !v && 'Elegí un destino',
      });
      if (r.isDenied) return toggle(item);
      if (!r.isConfirmed) return;
      reassignTo = r.value;
      if (!(await confirmDelete(`"${item.name}"`, `Sus ${item.productCount} producto(s) pasarán a "${options[reassignTo]}".`))) return;
    } else if (!(await confirmDelete(`"${item.name}"`))) return;

    try {
      await api.delete(`/admin/${cfg.endpoint}/${item._id}`, { params: reassignTo ? { reassignTo } : {} });
      notifySuccess('Eliminado');
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={`${items.length} en total · el orden define cómo se muestran en la tienda`}>
        <button type="button" className="btn-buy btn-sm" onClick={() => setForm({ open: true, item: null })}>
          <Icon name="plus" className="h-4 w-4" /> Nueva/o
        </button>
      </PageHeader>
      <div className="card mb-3 p-3">
        <SearchInput value={search} onChange={setSearch} placeholder={`Buscar ${cfg.singular}…`} />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !visible.length ? (
        <EmptyState title="Sin resultados" />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Nombre</th>
                <th>Productos</th>
                <th>Activa/o</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const globalIdx = items.findIndex((x) => x._id === item._id);
                return (
                  <tr key={item._id} className={!item.active ? 'opacity-60' : ''}>
                    <td className="whitespace-nowrap">
                      <button type="button" className="rounded-full p-1 text-petrol hover:bg-sky-light disabled:opacity-30" disabled={search || globalIdx === 0} onClick={() => move(item, -1)} aria-label="Subir"><Icon name="chevronUp" className="h-4 w-4" /></button>
                      <button type="button" className="rounded-full p-1 text-petrol hover:bg-sky-light disabled:opacity-30" disabled={search || globalIdx === items.length - 1} onClick={() => move(item, 1)} aria-label="Bajar"><Icon name="chevronDown" className="h-4 w-4" /></button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 font-bold">
                        {cfg.hasLogo && (item.logo?.url ? <img src={cld(item.logo.url, 80)} alt="" className="h-8 w-12 object-contain" /> : <span className="grid h-8 w-12 place-items-center rounded bg-sky-light text-gray-400"><Icon name="image" className="h-4 w-4" /></span>)}
                        {cfg.hasIcon && <span className="text-xl">{item.icon}</span>}
                        {item.name}
                        <span className="text-xs font-normal text-gray-400">/{item.slug}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/admin/productos?${cfg.productFilterKey}=${item._id}`} className="font-bold text-petrol hover:underline">
                        {item.productCount} <span className="text-xs font-normal text-gray-500">({item.activeProductCount} activos)</span>
                      </Link>
                    </td>
                    <td><Toggle checked={item.active} onChange={() => toggle(item)} label="Activa" /></td>
                    <td className="whitespace-nowrap text-right">
                      <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light" title="Editar" onClick={() => setForm({ open: true, item })}><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="rounded-full p-2 text-red-600 hover:bg-red-50" title="Eliminar" onClick={() => remove(item)}><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} onChange={setPage} />

      <EntityForm cfg={cfg} open={form.open} item={form.item} onClose={() => setForm({ open: false, item: null })} onSaved={reload} />
    </div>
  );
}

function EntityForm({ cfg, open, item, onClose, onSaved }) {
  const [logo, setLogo] = useState(null);
  const { register, handleSubmit, reset, setError, watch, setValue, formState } = useForm({ resolver: zodResolver(namedEntitySchema) });

  useEffect(() => {
    if (!open) return;
    reset({ name: item?.name || '', icon: item?.icon || '', active: item?.active ?? true });
    setLogo(item?.logo?.url ? item.logo : null);
  }, [open, item, reset]);

  const onSubmit = async (v) => {
    const payload = { name: v.name, active: v.active };
    if (cfg.hasIcon) payload.icon = v.icon || '';
    if (cfg.hasLogo) payload.logo = logo;
    try {
      if (item) await api.put(`/admin/${cfg.endpoint}/${item._id}`, payload);
      else await api.post(`/admin/${cfg.endpoint}`, payload);
      notifySuccess('Guardado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) alertError(errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Editar ${cfg.singular}` : `Nueva/o ${cfg.singular}`}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-buy" onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting}>Guardar</button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field label="Nombre *" error={formState.errors.name?.message} hint="No puede repetirse (sin importar mayúsculas ni tildes)">
          <Input error={formState.errors.name} {...register('name')} autoFocus />
        </Field>
        {cfg.hasIcon && (
          <Field label="Ícono / emoji (opcional)" error={formState.errors.icon?.message}>
            <Input maxLength={8} placeholder="🍫" {...register('icon')} />
          </Field>
        )}
        {cfg.hasLogo && <ImageUploader value={logo} onChange={setLogo} folder="emporio/proveedores" label="Logo (opcional)" aspect="aspect-[3/2]" />}
        <label className="flex items-center gap-2 font-bold">
          <Toggle checked={watch('active') ?? true} onChange={(v) => setValue('active', v)} label="Activa" /> Activa/o
        </label>
      </form>
    </Modal>
  );
}
