import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks';
import { errorMessage } from '../../utils/format';
import ProductPhoto from '../../components/catalog/ProductPhoto';
import swal, { confirmDelete, notifySuccess, alertError } from '../../utils/alerts';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PageHeader, SearchInput, InlineNumber } from '../../components/admin';
import { stockState } from '../../components/catalog/StockBadge';
import { EmptyState, Icon, Pagination, Select, Spinner, Toggle } from '../../components/ui';
import ProductForm from './ProductForm';
import { reviewNoteSchema } from '../../schemas';

const MAX_REVIEW_BULK = 500;

/** Pide la nota opcional para "Marcar para revisar" (misma regla que el back: hasta 200 caracteres) */
async function askReviewNote(text) {
  const r = await swal.fire({
    icon: 'warning',
    title: 'Marcar para revisar',
    text,
    input: 'textarea',
    inputLabel: 'Nota (opcional)',
    inputPlaceholder: 'Ej.: confirmar precio con el proveedor',
    inputAttributes: { maxlength: 200 },
    showCancelButton: true,
    confirmButtonText: 'Marcar',
    cancelButtonText: 'Cancelar',
    inputValidator: (v) => {
      const res = reviewNoteSchema.safeParse(v || '');
      return res.success ? undefined : res.error.issues[0].message;
    },
  });
  return r.isConfirmed ? (r.value || '').trim() : null;
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const threshold = useSettingsStore((s) => s.settings.lowStockThreshold);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [form, setForm] = useState({ open: false, id: null });

  const filters = {
    category: params.get('category') || '',
    supplier: params.get('supplier') || '',
    active: params.get('active') || '',
    noImage: params.get('noImage') || '',
    stock: params.get('stock') || '',
    needsReview: params.get('needsReview') || '',
    sort: params.get('sort') || '',
  };

  const { data: catData } = useApi('/admin/categories');
  const { data: supData } = useApi('/admin/suppliers');
  const categories = catData?.items || [];
  const suppliers = supData?.items || [];

  const query = useMemo(() => ({ page, limit: 25, q, ...filters, threshold }), [page, q, threshold, params]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, reload, setData } = useApi('/admin/products', query);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [q, params]);

  // Abrir edición directa desde el dashboard (?edit=id)
  useEffect(() => {
    const id = params.get('edit');
    if (id) {
      setForm({ open: true, id });
      const next = new URLSearchParams(params);
      next.delete('edit');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const patchLocal = (item) => setData((d) => ({ ...d, items: d.items.map((p) => (p._id === item._id ? item : p)) }));

  const quick = async (id, body) => {
    try {
      const { data: res } = await api.patch(`/admin/products/${id}`, body);
      patchLocal(res.item);
      return true;
    } catch (err) {
      alertError(errorMessage(err));
      return false;
    }
  };

  /** Marca de revisión de un producto: needsReview true = "para revisar", false = "revisado" */
  const setReview = async (p, needsReview) => {
    let reviewNote;
    if (needsReview) {
      reviewNote = await askReviewNote(`"${p.name}"`);
      if (reviewNote === null) return;
    }
    try {
      const { data: res } = await api.patch(`/admin/products/${p._id}/review`, { needsReview, reviewNote });
      notifySuccess(needsReview ? 'Marcado para revisar' : 'Marcado como revisado');
      // Si se está viendo solo "para revisar", el revisado sale de la lista
      if (filters.needsReview && !needsReview) reload();
      else patchLocal(res.item);
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const bulkReview = async (needsReview) => {
    const ids = [...selected];
    if (ids.length > MAX_REVIEW_BULK) return alertError(`Podés marcar hasta ${MAX_REVIEW_BULK} productos por vez`);
    let reviewNote;
    if (needsReview) {
      reviewNote = await askReviewNote(`Se aplicará a ${ids.length} producto(s)`);
      if (reviewNote === null) return;
    } else {
      const r = await swal.fire({
        icon: 'question',
        title: '¿Marcar como revisados?',
        text: `${ids.length} producto(s) dejan de estar "para revisar" y se borra su nota.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, marcar',
        cancelButtonText: 'Cancelar',
      });
      if (!r.isConfirmed) return;
    }
    try {
      const { data: res } = await api.patch('/admin/products/review/bulk', { ids, needsReview, reviewNote });
      notifySuccess(`${res.affected} producto(s) ${needsReview ? 'marcados para revisar' : 'revisados'}`);
      setSelected(new Set());
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const remove = async (p) => {
    if (!(await confirmDelete(`"${p.name}"`, 'Los pedidos que ya lo incluyen no se modifican (guardan una copia del nombre y precio).'))) return;
    try {
      await api.delete(`/admin/products/${p._id}`);
      notifySuccess('Producto eliminado');
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  const toggleSel = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allOnPage = data?.items?.length > 0 && data.items.every((p) => selected.has(p._id));
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      data.items.forEach((p) => (allOnPage ? n.delete(p._id) : n.add(p._id)));
      return n;
    });

  const bulk = async (action) => {
    const ids = [...selected];
    let value;
    if (action === 'delete') {
      if (!(await confirmDelete(`${ids.length} producto(s)`))) return;
    } else if (action === 'category' || action === 'supplier') {
      const list = action === 'category' ? categories : suppliers;
      const options = Object.fromEntries(list.map((x) => [x._id, x.name]));
      if (action === 'supplier') options[''] = '— Sin proveedor —';
      const r = await swal.fire({
        title: action === 'category' ? 'Cambiar categoría' : 'Cambiar proveedor',
        text: `Se aplicará a ${ids.length} producto(s)`,
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Elegí…',
        showCancelButton: true,
        confirmButtonText: 'Aplicar',
        cancelButtonText: 'Cancelar',
        inputValidator: (v) => action === 'category' && !v && 'Elegí una categoría',
      });
      if (!r.isConfirmed) return;
      value = r.value || null;
    }
    try {
      const { data: res } = await api.post('/admin/products/bulk', { ids, action, value });
      notifySuccess(`${res.affected} producto(s) actualizados`);
      setSelected(new Set());
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Productos" subtitle={data ? `${data.total} producto(s)` : ''}>
        <Link to="/admin/productos/importar" className="btn-primary btn-sm">
          <Icon name="upload" className="h-4 w-4" /> Planilla de productos (Excel)
        </Link>
        <Link to="/admin/productos/fotos" className="btn-primary btn-sm">
          <Icon name="image" className="h-4 w-4" /> Fotos
        </Link>
        <button type="button" className="btn-buy btn-sm" onClick={() => setForm({ open: true, id: null })}>
          <Icon name="plus" className="h-4 w-4" /> Nuevo
        </button>
      </PageHeader>

      <div className="card mb-3 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_140px_150px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Nombre, código o marca…" />
        <Select className="py-2" value={filters.category} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select className="py-2" value={filters.supplier} onChange={(e) => setParam('supplier', e.target.value)}>
          <option value="">Todos los proveedores</option>
          <option value="none">Sin proveedor</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select className="py-2" value={filters.active} onChange={(e) => setParam('active', e.target.value)}>
          <option value="">Activos e inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </Select>
        <Select className="py-2" value={filters.noImage ? 'noImage' : filters.stock} onChange={(e) => {
          const v = e.target.value;
          const next = new URLSearchParams(params);
          next.delete('noImage');
          next.delete('stock');
          if (v === 'noImage') next.set('noImage', 'true');
          else if (v) next.set('stock', v);
          setParams(next, { replace: true });
        }}>
          <option value="">Cualquier stock</option>
          <option value="out">Sin stock</option>
          <option value="low">Stock bajo</option>
          <option value="noImage">Productos sin foto</option>
        </Select>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setParam('needsReview', filters.needsReview ? '' : 'true')}
          aria-pressed={Boolean(filters.needsReview)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${filters.needsReview ? 'bg-candy-gold text-ink shadow-card' : 'bg-yellow-100 text-ink ring-1 ring-candy-gold/60 hover:bg-candy-gold/40'}`}
        >
          <span aria-hidden="true">⚠️</span> Para revisar ({data?.reviewCount ?? 0})
        </button>
        {filters.needsReview && (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            Mostrando solo los productos para revisar
            <button type="button" className="font-extrabold text-bubblegum underline-offset-2 hover:underline" onClick={() => setParam('needsReview', '')}>
              Ver todos
            </button>
          </span>
        )}
        <Select className="w-auto py-2 text-sm" value={filters.sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Orden">
          <option value="">Orden: A → Z</option>
          <option value="review_first">Para revisar primero</option>
          <option value="newest">Últimos cargados</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-petrol p-3 text-white shadow-soft">
          <span className="font-bold">{selected.size} seleccionado(s)</span>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulk('activate')}>Activar</button>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulk('deactivate')}>Desactivar</button>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulk('category')}>Cambiar categoría</button>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulk('supplier')}>Cambiar proveedor</button>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulkReview(false)}>✓ Marcar como revisado</button>
          <button type="button" className="btn-sm btn bg-white/15 hover:bg-white/25" onClick={() => bulkReview(true)}>⚠️ Marcar para revisar</button>
          <button type="button" className="btn-sm btn bg-bubblegum hover:bg-bubblegum-light" onClick={() => bulk('delete')}>Eliminar</button>
          <button type="button" className="ml-auto text-sm underline" onClick={() => setSelected(new Set())}>Limpiar</button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !data?.items.length ? (
        <EmptyState icon="box" title="No hay productos con esos filtros" />
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="table">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Seleccionar página" /></th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Activo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const st = stockState(p.stock, threshold);
                return (
                  <tr key={p._id} className={`${p.needsReview ? 'bg-yellow-100' : ''} ${!p.active && !p.needsReview ? 'opacity-60' : ''}`}>
                    <td className={p.needsReview ? 'border-l-4 border-candy-gold' : ''}><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSel(p._id)} aria-label={`Seleccionar ${p.name}`} /></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-sky-light">
                          {p.image?.url ? <ProductPhoto url={p.image.url} width={100} /> : <div className="grid h-full place-items-center text-gray-400"><Icon name="image" className="h-5 w-5" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-bold">{p.featured && <Icon name="star" className="mr-1 inline h-3.5 w-3.5 text-candy-gold" />}{p.name}</p>
                          {p.code && <p className="text-xs text-gray-500">Cód. {p.code}</p>}
                          {p.needsReview && (
                            <p className="flex max-w-[260px] items-center gap-1 text-xs font-bold text-amber-800" title={p.reviewNote || 'Para revisar'}>
                              <span aria-label="Para revisar">⚠️</span>
                              <span className="truncate">{p.reviewNote || 'Para revisar'}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{p.category?.name || '—'}</td>
                    <td className="whitespace-nowrap">{p.supplier?.name || <span className="text-gray-400">—</span>}</td>
                    <td><InlineNumber value={p.price} step="0.01" prefix="$ " onSave={(v) => quick(p._id, { price: v })} min={0} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className={`h-2.5 w-2.5 rounded-full ${st === 'out' ? 'bg-gray-400' : st === 'low' ? 'bg-candy-gold' : 'bg-mint'}`} title={st} />
                        <InlineNumber value={p.stock} onSave={(v) => quick(p._id, { stock: Math.floor(v) })} />
                      </div>
                    </td>
                    <td><Toggle checked={p.active} onChange={(v) => quick(p._id, { active: v })} label="Activo" /></td>
                    <td className="whitespace-nowrap text-right">
                      {p.needsReview ? (
                        <button type="button" className="rounded-full p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => setReview(p, false)} title="Marcar como revisado" aria-label="Marcar como revisado"><Icon name="check" className="h-4 w-4" /></button>
                      ) : (
                        <button type="button" className="rounded-full p-2 text-amber-600 hover:bg-yellow-100" onClick={() => setReview(p, true)} title="Marcar para revisar" aria-label="Marcar para revisar"><Icon name="alert" className="h-4 w-4" /></button>
                      )}
                      <button type="button" className="rounded-full p-2 text-petrol hover:bg-sky-light" onClick={() => setForm({ open: true, id: p._id })} title="Editar"><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="rounded-full p-2 text-red-600 hover:bg-red-50" onClick={() => remove(p)} title="Eliminar"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-3 pt-2 text-xs text-gray-500">Tip: hacé click en el precio o el stock para editarlo rápido (Enter para guardar, Esc para cancelar).</p>
        </div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />

      <ProductForm open={form.open} productId={form.id} categories={categories} suppliers={suppliers} onClose={() => setForm({ open: false, id: null })} onSaved={reload} />
    </div>
  );
}
