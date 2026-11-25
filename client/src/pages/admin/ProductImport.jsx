import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { errorMessage, formatPrice } from '../../utils/format';
import { downloadProductsSheet } from '../../utils/excel';
import swal, { notifySuccess, notifyError } from '../../utils/alerts';
import { Icon, Pagination, Spinner } from '../../components/ui';
import { usePaged } from '../../hooks/usePaged';

/** Qué columnas tomar de la planilla (igual que en la referencia, + proveedor) */
const FIELD_OPTIONS = [
  { value: 'price', label: 'Solo el precio' },
  { value: 'stock', label: 'Solo el stock' },
  { value: 'category', label: 'Solo la categoría' },
  { value: 'supplier', label: 'Solo el proveedor' },
  { value: 'name', label: 'Solo el nombre del producto' },
  { value: 'price,stock', label: 'Precio y stock' },
  { value: 'name,price,category,supplier,stock', label: 'Todas las columnas' },
];
const FIELD_LABEL = { precio: 'Precio', stock: 'Stock', categoria: 'Categoría', proveedor: 'Proveedor', nombre: 'Nombre', activo: 'Activo', revisar: 'Para revisar' };
const fmt = (field, v) => (field === 'precio' ? formatPrice(v) : v === '' || v === null || v === undefined ? '—' : v);
const MAX_MB = 4;

const confirm = async (title, text, confirmButtonText) =>
  (await swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: 'Cancelar' })).isConfirmed;

/** Tarjeta de contador del resultado */
function Stat({ label, value, tone }) {
  const tones = {
    neutral: 'border-petrol/10 bg-white text-petrol-dark',
    good: 'border-bubblegum/30 bg-bubblegum/10 text-bubblegum',
    warn: 'border-candy-gold/60 bg-yellow-100 text-ink',
    bad: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

/** Lista plegable (Ver lista / Ocultar) */
/** Lista paginada dentro de un plegable */
function PagedList({ items, perPage = 20, render }) {
  const paged = usePaged(items, perPage, items.length);
  return (
    <>
      <ul className="divide-y divide-petrol/5">{paged.items.map(render)}</ul>
      <Pagination page={paged.page} pages={paged.pages} onChange={paged.setPage} className="py-3" />
    </>
  );
}

function Collapsible({ title, count, tone = 'neutral', children }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className="mt-4 rounded-2xl border border-petrol/10 bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm font-bold ${tone === 'bad' ? 'text-red-700' : 'text-petrol-dark'}`}>
        <span>
          {title} ({count})
        </span>
        <span className="text-xs font-extrabold text-bubblegum">{open ? 'Ocultar' : 'Ver lista'}</span>
      </button>
      {open && <div className="max-h-80 overflow-y-auto border-t border-petrol/5">{children}</div>}
    </div>
  );
}

/** Selector de archivo: botón + nombre del archivo elegido */
function FilePicker({ onChange, resetKey }) {
  const ref = useRef(null);
  const [name, setName] = useState('Ningún archivo seleccionado');
  return (
    <div key={resetKey} className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-outline btn-sm" onClick={() => ref.current?.click()}>
        Elegir planilla
      </button>
      <span className="text-sm text-gray-500">{name}</span>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setName(f ? f.name : 'Ningún archivo seleccionado');
          onChange(f);
        }}
      />
    </div>
  );
}

export default function ProductImport() {
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [fields, setFields] = useState('price');
  const [createMissing, setCreateMissing] = useState(false);
  const [updateReview, setUpdateReview] = useState(false);
  const [busy, setBusy] = useState(null); // 'preview' | 'apply'
  const [plan, setPlan] = useState(null);

  const download = async () => {
    if (!(await confirm('¿Descargar la planilla?', 'Se va a descargar un Excel con el código, nombre, categoría, proveedor, precio, stock, activo y la marca de revisión de todos los productos.', 'Sí, descargar'))) return;
    setDownloading(true);
    try {
      await downloadProductsSheet();
      notifySuccess('Planilla descargada');
    } catch (err) {
      notifyError(errorMessage(err, 'No pudimos descargar el archivo'));
    } finally {
      setDownloading(false);
    }
  };

  const send = async (dryRun) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fields', fields);
    fd.append('createMissing', String(createMissing));
    fd.append('updateReview', String(updateReview));
    const { data } = await api.post(`/admin/products/import/${dryRun ? 'preview' : 'apply'}`, fd);
    return data;
  };

  const reset = () => {
    setPlan(null);
    setFile(null);
    setResetKey((k) => k + 1);
  };

  const preview = async () => {
    if (!file) return notifyError('Primero elegí la planilla');
    if (file.size > MAX_MB * 1024 * 1024) return notifyError(`La planilla supera ${MAX_MB} MB`);
    setBusy('preview');
    try {
      setPlan((await send(true)).plan);
    } catch (err) {
      setPlan(null);
      notifyError(errorMessage(err, 'No pudimos leer la planilla'));
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    const parts = [];
    if (plan.toUpdate.length) parts.push(`actualizar ${plan.toUpdate.length} producto(s)`);
    if (plan.toCreate.length) parts.push(`crear ${plan.toCreate.length} producto(s) nuevo(s)`);
    if (!(await confirm('¿Guardar los cambios?', `Vas a ${parts.join(' y ')}. Se aplica en la tienda al instante.`, 'Sí, guardar'))) return;
    setBusy('apply');
    try {
      const { result } = await send(false);
      await swal.fire({
        icon: result.errorCount ? 'warning' : 'success',
        title: '¡Listo!',
        text: `${result.updated} actualizado(s), ${result.created} creado(s)${result.warnings ? ` (${result.warnings} inactivo(s) por falta de precio/stock)` : ''}, ${result.review || 0} para revisar y ${result.errorCount} con error.`,
      });
      reset();
    } catch (err) {
      swal.fire({ icon: 'error', title: 'No pudimos guardar', text: errorMessage(err, 'Probá de nuevo en unos minutos.') });
    } finally {
      setBusy(null);
    }
  };

  const nothing = plan && !plan.toUpdate.length && !plan.toCreate.length;
  const updatesPaged = usePaged(plan?.toUpdate || [], 25, plan);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/productos" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-bubblegum">
        <Icon name="chevronLeft" className="h-4 w-4" /> Productos
      </Link>
      <h1 className="mt-4 text-3xl text-petrol-dark">Planilla de productos</h1>
      <p className="mt-1 text-sm text-gray-600">
        Un solo Excel para todo: <b>codigo, nombre, categoria, proveedor, precio, stock, activo, revisar y nota_revision</b>. Descargalo, cambiá lo que necesites y volvé a subirlo. Antes de guardar vas a ver qué cambia. Nunca se borran productos.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-petrol/10 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-petrol-dark">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bubblegum/10 text-bubblegum">1</span> Descargar la planilla
          </p>
          <p className="mt-2 text-sm text-gray-600">Con todos los productos de la tienda, lista para editar. Las columnas categoria, proveedor, activo y revisar traen una lista desplegable, y los productos para revisar vienen pintados de amarillo.</p>
          <button type="button" className="btn-outline mt-4" onClick={download} disabled={downloading}>
            {downloading ? <Spinner className="h-4 w-4" /> : <Icon name="download" className="h-4 w-4" />} Descargar planilla de productos
          </button>
        </div>

        <div className="rounded-2xl border border-petrol/10 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-petrol-dark">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bubblegum/10 text-bubblegum">2</span> Subir planilla de productos
          </p>
          <p className="mt-2 text-sm text-gray-600">Primero elegí qué querés actualizar; después, el archivo.</p>

          <label className="mt-4 block text-sm font-bold text-petrol-dark">
            a) ¿Qué querés actualizar?
            <select value={fields} onChange={(e) => { setFields(e.target.value); setPlan(null); }} className="input mt-1.5 py-2.5 text-sm" aria-label="Qué columna actualizar">
              {FIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-500">Se toma solo eso de la planilla; lo demás queda como está.</span>
          </label>

          <label className="mt-4 block text-sm font-bold text-petrol-dark">
            b) Si un producto de la planilla no está en la tienda
            <select value={String(createMissing)} onChange={(e) => { setCreateMissing(e.target.value === 'true'); setPlan(null); }} className="input mt-1.5 py-2.5 text-sm" aria-label="Productos que no están en la tienda">
              <option value="false">Ignorarlo (no se crea nada nuevo)</option>
              <option value="true">Crearlo (necesita nombre y una categoría que exista; sin precio o stock se crea inactivo)</option>
            </select>
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-candy-gold/15 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={updateReview}
              onChange={(e) => { setUpdateReview(e.target.checked); setPlan(null); }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-bubblegum"
            />
            <span>
              <b className="text-petrol-dark">Actualizar marca de revisión</b>
              <span className="block text-xs text-gray-600">Toma las columnas <b>revisar</b> (SI/NO) y <b>nota_revision</b> para los productos que ya están. A los nuevos se les aplica siempre.</span>
            </span>
          </label>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-bold text-petrol-dark">c) Elegí el archivo (Excel o CSV)</p>
            <FilePicker resetKey={resetKey} onChange={(f) => { setFile(f); setPlan(null); }} />
          </div>

          <button type="button" className="btn-primary mt-4" onClick={preview} disabled={!file || Boolean(busy)}>
            {busy === 'preview' ? <Spinner className="h-4 w-4" /> : <Icon name="eye" className="h-4 w-4" />} Ver qué va a cambiar
          </button>
        </div>
      </div>

      {plan && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <Stat label="Se actualizan" value={plan.toUpdate.length} tone="good" />
            <Stat label="Se crean" value={plan.toCreate.length} tone={plan.toCreate.length ? 'good' : 'neutral'} />
            <Stat label="Sin cambios" value={plan.unchanged.length} tone="neutral" />
            <Stat label="Ignorados" value={plan.skipped.length} tone="neutral" />
            <Stat label="Con errores" value={plan.errors.length} tone={plan.errors.length ? 'bad' : 'neutral'} />
            <Stat label="Advertencias" value={plan.warnings?.length || 0} tone={plan.warnings?.length ? 'warn' : 'neutral'} />
            <Stat label="Para revisar" value={plan.summary?.review || 0} tone={plan.summary?.review ? 'warn' : 'neutral'} />
          </div>

          {plan.toUpdate.length > 0 && (
            <div className="mt-4 overflow-auto rounded-2xl border border-petrol/10 bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 bg-sky-light text-xs uppercase tracking-wide text-petrol-dark">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Qué cambia</th>
                    <th className="px-4 py-3">Ahora</th>
                    <th className="px-4 py-3">Queda</th>
                  </tr>
                </thead>
                <tbody>
                  {updatesPaged.items.flatMap((u) =>
                    u.changes.map((c, i) => (
                      <tr key={`${u.row}-${c.field}`} className={i === 0 ? 'border-t border-petrol/10' : ''}>
                        <td className="px-4 py-2 font-semibold text-ink">{i === 0 && u.name}</td>
                        <td className="px-4 py-2 text-gray-600">{FIELD_LABEL[c.field] || c.field}</td>
                        <td className="px-4 py-2 text-gray-500">{fmt(c.field, c.from)}</td>
                        <td className="px-4 py-2 font-bold text-petrol-dark">
                          → {fmt(c.field, c.to)}
                          {c.field === 'revisar' && c.note && <span className="block text-xs font-normal text-gray-600">{c.note}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {plan.toUpdate.length > 0 && <Pagination page={updatesPaged.page} pages={updatesPaged.pages} onChange={updatesPaged.setPage} className="mt-3" />}

          {nothing && <p className="mt-4 rounded-2xl border border-petrol/10 bg-white px-5 py-6 text-center text-sm text-gray-500">Con esta planilla y estas opciones no cambia nada.</p>}

          <Collapsible title="Productos nuevos que se van a crear" count={plan.toCreate.length}>
            <PagedList items={plan.toCreate} render={(p) => (
                <li key={p.row} className={`flex flex-wrap justify-between gap-2 px-5 py-2 text-sm ${p.needsReview ? 'border-l-4 border-candy-gold bg-yellow-100' : ''}`}>
                  <span className="min-w-0 text-ink">
                    {p.needsReview && <span aria-label="Para revisar" title={p.reviewNote || 'Para revisar'}>⚠️ </span>}
                    {p.name}
                    {p.warning && <span className="block text-xs font-bold text-amber-700">{p.warning}</span>}
                    {p.needsReview && p.reviewNote && <span className="block text-xs text-gray-600">{p.reviewNote}</span>}
                  </span>
                  <span className="text-gray-500">
                    {formatPrice(p.price)} · {p.categoryName}
                    {p.supplierName ? ` · ${p.supplierName}` : ''} · stock {p.stock}
                  </span>
                </li>
              )} />
          </Collapsible>

          <Collapsible title="Advertencias (se guardan igual)" count={plan.warnings?.length || 0}>
            <PagedList items={plan.warnings || []} render={(w) => (
                <li key={w.row} className="px-5 py-2 text-sm">
                  <span className="mr-2 text-xs text-gray-500">Fila {w.row}</span>
                  <span className="text-ink">{w.name}</span>
                  <p className="text-xs font-bold text-amber-700">{w.reason}</p>
                </li>
              )} />
          </Collapsible>

          <Collapsible title="Filas con errores (no se guardan)" count={plan.errors.length} tone="bad">
            <PagedList items={plan.errors} render={(e, i) => (
                <li key={`${e.row}-${i}`} className="px-5 py-2 text-sm">
                  <span className="mr-2 text-xs text-gray-500">Fila {e.row}</span>
                  <span className="text-ink">{e.data?.nombre || e.data?.codigo || '—'}</span>
                  <p className="text-xs text-red-700">{e.reason}</p>
                </li>
              )} />
          </Collapsible>

          <Collapsible title="Productos que no están en la tienda (se ignoran)" count={plan.skipped.length}>
            <PagedList items={plan.skipped} render={(s) => (
                <li key={s.row} className="px-5 py-2 text-sm text-ink">
                  <span className="mr-2 text-xs text-gray-500">Fila {s.row}</span>
                  {s.name}
                </li>
              )} />
          </Collapsible>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-buy" onClick={apply} disabled={nothing || Boolean(busy)}>
              {busy === 'apply' ? <Spinner className="h-4 w-4" /> : <Icon name="check" className="h-4 w-4" />} Guardar cambios
            </button>
            <button type="button" className="btn-ghost" onClick={reset} disabled={Boolean(busy)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs text-gray-500">
        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Consejo: no cambies la columna codigo; así cada fila se reconoce con su producto. Para cambiar nombres, la fila tiene que tener su código.</span>
      </p>
    </div>
  );
}
