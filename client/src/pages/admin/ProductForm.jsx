import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios';
import { productSchema, applyServerErrors } from '../../schemas';
import { errorMessage } from '../../utils/format';
import { notifySuccess, alertError } from '../../utils/alerts';
import { ImageUploader } from '../../components/admin';
import { Field, Input, Modal, Select, Spinner, Textarea, Toggle } from '../../components/ui';

const EMPTY = { name: '', code: '', category: '', supplier: '', price: '', stock: 0, description: '', active: true, featured: false };

/** Alta y edición de producto (mismo componente) */
export default function ProductForm({ open, productId, categories, suppliers, onClose, onSaved }) {
  const isEdit = Boolean(productId);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null); // { needsReview, reviewNote } (no se edita desde el formulario)
  const [reviewBusy, setReviewBusy] = useState(false);
  const { register, handleSubmit, reset, setError, watch, setValue, formState } = useForm({ resolver: zodResolver(productSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    if (!productId) {
      reset(EMPTY);
      setImage(null);
      setReview(null);
      return;
    }
    setLoading(true);
    api
      .get(`/admin/products/${productId}`)
      .then(({ data }) => {
        const p = data.item;
        reset({
          name: p.name,
          code: p.code || '',
          category: String(p.category || ''),
          supplier: p.supplier ? String(p.supplier) : '',
          price: p.price,
          stock: p.stock,
          description: p.description || '',
          active: p.active,
          featured: Boolean(p.featured),
        });
        setImage(p.image?.url ? p.image : null);
        setReview({ needsReview: Boolean(p.needsReview), reviewNote: p.reviewNote || '' });
      })
      .catch((err) => alertError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, productId, reset]);

  const onSubmit = async (values) => {
    const payload = { ...values, supplier: values.supplier || null, image };
    try {
      if (isEdit) await api.put(`/admin/products/${productId}`, payload);
      else await api.post('/admin/products', payload);
      notifySuccess(isEdit ? 'Producto actualizado' : 'Producto creado');
      onSaved();
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) alertError(errorMessage(err));
    }
  };

  /** "Marcar como revisado" desde el cartel (guardar el formulario NO toca la marca) */
  const markReviewed = async () => {
    setReviewBusy(true);
    try {
      await api.patch(`/admin/products/${productId}/review`, { needsReview: false });
      setReview({ needsReview: false, reviewNote: '' });
      notifySuccess('Marcado como revisado');
      onSaved();
    } catch (err) {
      alertError(errorMessage(err));
    } finally {
      setReviewBusy(false);
    }
  };

  const e = formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      size="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-buy" onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting || loading}>
            {formState.isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-[1fr_220px]">
          {review?.needsReview && (
            <div role="status" className="flex flex-wrap items-start gap-3 rounded-2xl border-l-4 border-candy-gold bg-yellow-100 px-4 py-3 text-sm text-ink sm:col-span-2">
              <span aria-hidden="true" className="text-lg leading-none">⚠️</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">Este producto está marcado para revisar</p>
                {review.reviewNote && <p className="mt-0.5 break-words text-gray-700">{review.reviewNote}</p>}
                <p className="mt-0.5 text-xs text-gray-600">Guardar los cambios no quita la marca.</p>
              </div>
              <button type="button" className="btn-outline btn-sm shrink-0 bg-white" onClick={markReviewed} disabled={reviewBusy}>
                {reviewBusy ? <Spinner className="h-4 w-4" /> : '✓'} Marcar como revisado
              </button>
            </div>
          )}
          <div className="space-y-3">
            <Field label="Nombre *" error={e.name?.message}>
              <Input error={e.name} {...register('name')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código" error={e.code?.message} hint="Recomendado para el Excel">
                <Input error={e.code} {...register('code')} />
              </Field>
              <Field label="Precio *" error={e.price?.message}>
                <Input type="number" step="0.01" min="0" inputMode="decimal" error={e.price} {...register('price')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría *" error={e.category?.message}>
                <Select error={e.category} {...register('category')}>
                  <option value="">Elegí…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {!c.active ? ' (inactiva)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Proveedor" error={e.supplier?.message}>
                <Select error={e.supplier} {...register('supplier')}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Stock *" error={e.stock?.message}>
              <Input type="number" step="1" min="0" inputMode="numeric" error={e.stock} {...register('stock')} />
            </Field>
            <Field label="Descripción" error={e.description?.message}>
              <Textarea maxLength={1000} {...register('description')} />
            </Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 font-bold">
                <Toggle checked={watch('active')} onChange={(v) => setValue('active', v)} label="Activo" /> Activo (visible)
              </label>
              <label className="flex items-center gap-2 font-bold">
                <Toggle checked={watch('featured')} onChange={(v) => setValue('featured', v)} label="Destacado" /> Destacado en el inicio
              </label>
            </div>
          </div>
          <ImageUploader value={image} onChange={setImage} folder="emporio/productos" label="Foto" />
        </form>
      )}
    </Modal>
  );
}
