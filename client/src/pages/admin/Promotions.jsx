import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useSettingsStore } from '../../store/useSettingsStore';
import { promotionSchema, applyServerErrors } from '../../schemas';
import { errorMessage } from '../../utils/format';
import { cld } from '../../utils/cloudinary';
import swal, { confirmDelete, notifySuccess, notifyError } from '../../utils/alerts';
import { ImageUploader } from '../../components/admin';
import { Icon, Pagination, Spinner } from '../../components/ui';

export const OCCASIONS = {
  general: 'Promoción común',
  navidad: 'Navidad',
  dia_del_nino: 'Día del Niño',
  dia_de_la_madre: 'Día de la Madre',
  dia_del_padre: 'Día del Padre',
  pascuas: 'Pascuas',
  halloween: 'Halloween',
  san_valentin: 'San Valentín',
  black_friday: 'Black Friday',
  hot_sale: 'Hot Sale',
  otra: 'Otra fecha especial',
};
const SCOPES = { all: 'Toda la tienda', categories: 'Algunas categorías', products: 'Algunos productos' };
const KIND_FILTER = [
  { value: 'special', label: 'Fechas especiales' },
  { value: 'general', label: 'Promociones' },
];
const STATUS = {
  vigente: ['Vigente', 'bg-mint text-petrol-dark'],
  programada: ['Programada', 'bg-sky text-white'],
  terminada: ['Terminada', 'bg-gray-100 text-gray-600'],
  pausada: ['Pausada', 'bg-gray-100 text-gray-600'],
};
const PER_PAGE = 10;

const kindOf = (p) => (p.occasion && p.occasion !== 'general' ? 'special' : 'general');
const shortDate = (d) =>
  new Date(d).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
/** Ahora en formato datetime-local (hora AR) */
const nowLocal = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 16);

const confirm = async (title, text, confirmButtonText) =>
  (await swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: 'Cancelar' })).isConfirmed;

const defaults = (p) => ({
  title: p?.title || '',
  description: p?.description || '',
  discountPercent: p?.discountPercent ?? '',
  occasion: p?.occasion || 'general',
  occasionName: p?.occasionName || '',
  scope: p?.scope || 'all',
  categories: (p?.categories || []).map((c) => c._id || c),
  products: (p?.products || []).map((x) => x._id || x),
  startDate: p?.startLocal || nowLocal(),
  endDate: p?.endLocal || '',
  active: p?.active ?? true,
  price: p?.price ?? '',
  regularPrice: p?.regularPrice ?? '',
  showInPopup: p?.showInPopup ?? true,
});

// ---------- Campos reutilizables con el estilo del formulario ----------
const Label = ({ children }) => <span className="mb-1.5 block text-sm font-bold text-petrol-dark">{children}</span>;
const Err = ({ e }) => (e ? <p className="mt-1 text-xs font-semibold text-red-600">{e.message}</p> : null);
const fieldCls = (e) => `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky focus:ring-4 focus:ring-sky/20 ${e ? 'border-red-400' : 'border-petrol/15'}`;

/** Buscador de productos con chips (escribís y elegís de la lista) */
function ProductPicker({ options, value, onChange }) {
  const [q, setQ] = useState('');
  const selected = value.map((id) => options.find((o) => o._id === id) || { _id: id, name: 'Producto' });
  const pick = (text) => {
    const found = options.find((o) => o.name.toLowerCase() === text.trim().toLowerCase());
    if (found) {
      if (!value.includes(found._id)) onChange([...value, found._id]);
      setQ('');
    }
  };
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">Escribí el nombre y elegilo de la lista. Podés sumar varios.</p>
      <input
        list="promo-product-options"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (options.some((o) => o.name === e.target.value)) pick(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            pick(q);
          }
        }}
        placeholder="Escribí para buscar un producto…"
        className={fieldCls()}
      />
      <datalist id="promo-product-options">
        {options.map((o) => (
          <option key={o._id} value={o.name} />
        ))}
      </datalist>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span key={s._id} className="inline-flex items-center gap-1 rounded-full bg-bubblegum/10 py-1 pl-3 pr-1 text-xs font-bold text-bubblegum">
              {s.name}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== s._id))} aria-label={`Quitar ${s.name}`} className="rounded-full p-0.5 hover:bg-bubblegum/20">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Formulario (modal) de alta / edición — igual a la referencia */
function PromotionDialog({ open, editing, categories, productOptions, onSaved, onClose }) {
  const [image, setImage] = useState(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, control, reset, watch, setError, formState } = useForm({ resolver: zodResolver(promotionSchema(Boolean(editing))), defaultValues: defaults(editing) });
  const e = formState.errors;
  const scope = watch('scope');
  const occasion = watch('occasion');

  useEffect(() => {
    if (!open) return;
    reset(defaults(editing));
    setImage(editing?.image?.url ? editing.image : null);
    setServerError('');
    setExtrasOpen(Boolean(editing?.price || editing?.regularPrice || editing?.image?.url));
  }, [open, editing, reset]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onSubmit = async (v) => {
    const ok = await confirm(
      editing ? '¿Guardar los cambios?' : '¿Crear esta promoción?',
      editing ? 'Vas a actualizar esta promoción en la tienda.' : 'Se publica sola en la fecha y hora que elegiste.',
      editing ? 'Sí, guardar' : 'Sí, crear'
    );
    if (!ok) return;
    setServerError('');
    const payload = {
      ...v,
      occasionName: v.occasion === 'otra' ? v.occasionName : '',
      categories: v.scope === 'categories' ? v.categories : [],
      products: v.scope === 'products' ? v.products : [],
      price: v.price === '' ? null : v.price,
      regularPrice: v.regularPrice === '' ? null : v.regularPrice,
      image,
    };
    try {
      if (editing) await api.put(`/admin/promotions/${editing._id}`, payload);
      else await api.post('/admin/promotions', payload);
      notifySuccess(editing ? 'Promoción actualizada' : 'Promoción creada');
      onSaved();
    } catch (err) {
      if (!applyServerErrors(err, setError)) {
        const msg = errorMessage(err, 'No pudimos guardar la promoción');
        setServerError(msg);
        notifyError(msg);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-dialog-title"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={handleSubmit(onSubmit, () => notifyError('Revisá los campos marcados en rojo'))}
            noValidate
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-petrol/10 px-5 py-4">
              <p id="promo-dialog-title" className="font-display text-lg font-semibold text-petrol-dark">
                {editing ? `Editar: ${editing.title}` : 'Nueva promoción'}
              </p>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-gray-500 hover:bg-sky-light">
                <Icon name="close" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <label>
                  <Label>Nombre</Label>
                  <input placeholder="Ej: 20% en chocolates" className={fieldCls(e.title)} {...register('title')} />
                  <Err e={e.title} />
                </label>
                <label>
                  <Label>Descuento (%)</Label>
                  <input type="number" min="1" max="100" className={fieldCls(e.discountPercent)} {...register('discountPercent')} />
                  <Err e={e.discountPercent} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <Label>Ocasión</Label>
                  <select className={fieldCls()} {...register('occasion')}>
                    {Object.entries(OCCASIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {k === 'general' ? 'Promoción común (sin fecha especial)' : k === 'otra' ? 'Otra fecha (escribís el nombre)' : v}
                      </option>
                    ))}
                  </select>
                </label>
                {occasion === 'otra' ? (
                  <label>
                    <Label>Nombre de la fecha</Label>
                    <input placeholder="Ej: Aniversario" className={fieldCls(e.occasionName)} {...register('occasionName')} />
                    <Err e={e.occasionName} />
                  </label>
                ) : (
                  <label>
                    <Label>Se aplica a</Label>
                    <select className={fieldCls(e.scope)} {...register('scope')}>
                      {Object.entries(SCOPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {occasion === 'otra' && (
                <label className="block">
                  <Label>Se aplica a</Label>
                  <select className={fieldCls(e.scope)} {...register('scope')}>
                    {Object.entries(SCOPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
              )}

              {scope === 'categories' && (
                <Controller
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <div>
                      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                        {categories.map((c) => {
                          const on = field.value?.includes(c._id);
                          return (
                            <button
                              key={c._id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => field.onChange(on ? field.value.filter((x) => x !== c._id) : [...(field.value || []), c._id])}
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${on ? 'border-bubblegum bg-bubblegum/10 text-bubblegum' : 'border-petrol/15 text-gray-600'}`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                      <Err e={e.categories} />
                    </div>
                  )}
                />
              )}

              {scope === 'products' && (
                <Controller
                  control={control}
                  name="products"
                  render={({ field }) => (
                    <div>
                      <ProductPicker options={productOptions} value={field.value || []} onChange={field.onChange} />
                      <Err e={e.products} />
                    </div>
                  )}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <Label>Empieza</Label>
                  <input type="datetime-local" className={fieldCls(e.startDate)} {...register('startDate')} />
                  <Err e={e.startDate} />
                </label>
                <label>
                  <Label>Termina</Label>
                  <input type="datetime-local" className={fieldCls(e.endDate)} {...register('endDate')} />
                  <Err e={e.endDate} />
                </label>
              </div>
              <p className="-mt-2 text-xs text-gray-500">Se activa y se termina sola en esas fechas (hora de Argentina).</p>

              <label className="block">
                <Label>Descripción (opcional)</Label>
                <textarea rows={2} placeholder="Qué incluye, condiciones, etc." className={fieldCls(e.description)} {...register('description')} />
                <Err e={e.description} />
              </label>

              <div className="rounded-2xl border border-petrol/10">
                <button type="button" onClick={() => setExtrasOpen((v) => !v)} aria-expanded={extrasOpen} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-petrol-dark">
                  Cartel y foto (opcional)
                  <Icon name="chevronDown" className={`h-4 w-4 transition-transform ${extrasOpen ? 'rotate-180' : ''}`} />
                </button>
                {extrasOpen && (
                  <div className="space-y-3 border-t border-petrol/10 px-4 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <Label>Precio para mostrar ($)</Label>
                        <input type="number" min="0" placeholder="Opcional" className={fieldCls(e.price)} {...register('price')} />
                        <Err e={e.price} />
                      </label>
                      <label>
                        <Label>Precio normal ($)</Label>
                        <input type="number" min="0" placeholder="Se ve tachado" className={fieldCls(e.regularPrice)} {...register('regularPrice')} />
                        <Err e={e.regularPrice} />
                      </label>
                    </div>
                    <p className="-mt-1 text-xs text-gray-500">Solo se muestran en el cartel. Lo que se cobra es el descuento (%).</p>
                    <label className="flex items-center gap-2 text-sm text-petrol-dark">
                      <input type="checkbox" className="h-4 w-4 accent-[#CE5487]" {...register('showInPopup')} /> Mostrar en el cartel al entrar a la tienda
                    </label>
                    <ImageUploader value={image} onChange={setImage} folder="emporio/promociones" label="Foto de la promoción" aspect="aspect-[16/10]" contain={false} />
                  </div>
                )}
              </div>
              {serverError && <p className="text-sm font-semibold text-red-600">{serverError}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-petrol/10 px-5 py-3">
              <label className="flex items-center gap-2 text-sm font-bold text-petrol-dark">
                <input type="checkbox" className="h-4 w-4 accent-[#CE5487]" {...register('active')} /> Publicada{' '}
                <span className="text-xs font-normal text-gray-500">(destildala para pausarla)</span>
              </label>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn-buy btn-sm" disabled={formState.isSubmitting}>
                  {formState.isSubmitting ? <Spinner className="h-4 w-4" /> : editing ? 'Guardar cambios' : 'Crear promoción'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Interruptor "Cartel al entrar a la tienda" (Settings.promoPopupEnabled) */
function PopupSwitch() {
  const { data, setData } = useApi('/admin/settings');
  const invalidate = useSettingsStore((s) => s.invalidate);
  const [saving, setSaving] = useState(false);
  if (!data) return null;
  const on = data.settings.promoPopupEnabled !== false;

  const toggle = async () => {
    const next = !on;
    const ok = await confirm(
      next ? '¿Mostrar el cartel de promociones?' : '¿Sacar el cartel de promociones?',
      next ? 'Al entrar a la tienda se va a abrir un cartel con las promociones vigentes.' : 'Ya no se va a abrir el cartel al entrar. Las promociones siguen apareciendo en la página principal.',
      next ? 'Sí, mostrar' : 'Sí, sacar'
    );
    if (!ok) return;
    setSaving(true);
    try {
      const { data: res } = await api.put('/admin/settings', { promoPopupEnabled: next });
      setData({ ...data, settings: res.settings });
      invalidate();
      notifySuccess(next ? 'El cartel de promociones está activado' : 'El cartel de promociones está desactivado');
    } catch (err) {
      notifyError(errorMessage(err, 'No pudimos cambiar el cartel'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-petrol/10 bg-white p-4">
      <div>
        <p className="text-sm font-bold text-petrol-dark">Cartel al entrar a la tienda</p>
        <p className="text-xs text-gray-500">{on ? 'Activado: al entrar se abre un cartel con las promociones vigentes.' : 'Desactivado: las promociones solo se ven en la página principal.'}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={saving} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-bubblegum' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        <span className="sr-only">{on ? 'Desactivar el cartel' : 'Activar el cartel'}</span>
      </button>
    </div>
  );
}

export default function Promotions() {
  const { data, loading, error, reload } = useApi('/admin/promotions');
  const { data: catData } = useApi('/admin/categories');
  const { data: prodData } = useApi('/admin/products/lookup');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState({ open: false, editing: null });

  const all = data?.items || [];
  const filtered = useMemo(() => (kind ? all.filter((p) => kindOf(p) === kind) : all), [all, kind]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  useEffect(() => setPage(1), [kind]);

  const close = () => setDialog({ open: false, editing: null });

  const remove = async (p) => {
    if (!(await confirmDelete(`la promoción "${p.title}"`))) return;
    try {
      await api.delete(`/admin/promotions/${p._id}`);
      notifySuccess('Promoción eliminada');
      reload();
    } catch (err) {
      notifyError(errorMessage(err, 'No pudimos eliminar la promoción'));
    }
  };

  const duplicate = async (p) => {
    try {
      await api.post(`/admin/promotions/${p._id}/duplicate`);
      notifySuccess('Promoción duplicada (queda pausada: cambiá las fechas y publicala)');
      reload();
    } catch (err) {
      notifyError(errorMessage(err));
    }
  };

  if (error)
    return (
      <div className="rounded-2xl border border-petrol/10 bg-white p-10 text-center">
        <p className="text-gray-600">No pudimos cargar las promociones.</p>
        <button type="button" className="btn-outline btn-sm mt-3" onClick={reload}>Reintentar</button>
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl text-petrol-dark">Promociones</h1>
        <button type="button" className="btn-buy btn-sm" onClick={() => setDialog({ open: true, editing: null })}>
          <Icon name="plus" className="h-4 w-4" /> Nueva promoción
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-600">Cada promoción es un descuento en % que se aplica solo a los productos elegidos mientras esté vigente.</p>

      <PopupSwitch />

      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="promo-kind-filter" className="text-sm font-bold text-petrol-dark">Filtrar promociones</label>
        <select id="promo-kind-filter" value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-petrol/15 bg-white px-3 py-2 text-sm outline-none focus:border-sky">
          <option value="">Todas</option>
          {KIND_FILTER.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {visible.map((p) => {
            const [statusText, statusCls] = STATUS[p.status] || STATUS.pausada;
            return (
              <div key={p._id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-petrol/10 bg-white p-4">
                <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sky-light">
                    {p.image?.url ? <img src={cld(p.image.url, 120)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl">🏷️</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{p.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-bubblegum px-2 py-0.5 font-extrabold text-white">{p.label}</span>
                      {p.occasionLabel && <span className="rounded-full bg-bubblegum/10 px-2 py-0.5 font-bold text-bubblegum">{p.occasionLabel}</span>}
                      <span className="text-gray-500">
                        {p.scope === 'all' ? 'Toda la tienda' : p.scope === 'categories' ? `${p.categories?.length || 0} categoría(s)` : `${p.products?.length || 0} producto(s)`}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {shortDate(p.startDate)} al {shortDate(p.endDate)}
                      {p.showInPopup !== false && ' · sale en el cartel'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`badge ${statusCls}`}>{statusText}</span>
                  <button type="button" onClick={() => setDialog({ open: true, editing: p })} className="text-sm font-bold text-bubblegum hover:underline">Editar</button>
                  <button type="button" onClick={() => duplicate(p)} className="text-sm font-bold text-petrol hover:underline">Duplicar</button>
                  <button type="button" onClick={() => remove(p)} className="text-sm font-bold text-red-600 hover:underline">Eliminar</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-petrol/20 p-10 text-center text-gray-400 xl:col-span-2">
              {all.length ? 'No hay promociones de este tipo.' : 'Todavía no cargaste promociones.'}
            </div>
          )}
        </div>
      )}
      <Pagination page={current} pages={pages} onChange={setPage} />

      <PromotionDialog
        open={dialog.open}
        editing={dialog.editing}
        categories={catData?.items || []}
        productOptions={prodData?.items || []}
        onSaved={() => {
          close();
          reload();
        }}
        onClose={close}
      />
    </div>
  );
}
