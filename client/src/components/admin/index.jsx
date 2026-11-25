import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadToCloudinary, validateImage, cld } from '../../utils/cloudinary';
import { errorMessage } from '../../utils/format';
import { waLink } from '../../utils/whatsapp';
import { formatPhone } from '../../utils/phone';
import { notifyError } from '../../utils/alerts';
import { Icon, Spinner } from '../ui';

/** Encabezado de página del admin */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl text-petrol-dark">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Tarjeta de estadística del dashboard */
export function StatCard({ label, value, icon, tone = 'petrol', to }) {
  const tones = {
    petrol: 'bg-petrol text-white',
    bubblegum: 'bg-bubblegum text-white',
    gold: 'bg-candy-gold text-ink',
    mint: 'bg-mint text-petrol-dark',
    sky: 'bg-sky text-white',
  };
  const Comp = to ? Link : 'div';
  return (
    <Comp to={to} className="card flex items-center gap-4 p-4 transition hover:shadow-soft">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon name={icon} />
      </span>
      <div>
        <p className="text-2xl font-black text-petrol-dark">{value}</p>
        <p className="text-sm font-bold text-gray-500">{label}</p>
      </div>
    </Comp>
  );
}

/**
 * Subida de UNA imagen directo a Cloudinary (firma del back) con vista previa.
 * value: { url, public_id } | null — onChange recibe el nuevo valor (o null para quitar).
 */
export function ImageUploader({ value, onChange, folder = 'emporio/productos', label = 'Imagen', aspect = 'aspect-square', contain = true, maxWidth = 1200, wide = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFile = async (file) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) return notifyError(err);
    setUploading(true);
    setProgress(0);
    try {
      const img = await uploadToCloudinary(file, folder, { onProgress: setProgress, maxWidth });
      onChange(img);
    } catch (e) {
      notifyError(errorMessage(e, e.message));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div
        className={`relative ${aspect} w-full ${wide ? 'max-w-[460px]' : 'max-w-[220px]'} overflow-hidden rounded-2xl border-2 border-dashed border-sky bg-sky-light/50`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        {value?.url ? (
          <img src={cld(value.url, 440)} alt="" className={`h-full w-full ${contain ? 'object-contain' : 'object-cover'} bg-white`} />
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-petrol">
            <Icon name="image" className="h-8 w-8" />
            <span className="text-sm font-bold">Subir imagen</span>
            <span className="text-xs text-gray-500">JPG, PNG o WEBP · máx 5 MB</span>
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/80">
            <div className="text-center">
              <Spinner />
              <p className="mt-1 text-sm font-bold text-petrol">{progress}%</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-outline btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name="upload" className="h-4 w-4" /> {value?.url ? 'Cambiar' : 'Elegir'}
        </button>
        {value?.url && (
          <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => onChange(null)} disabled={uploading}>
            <Icon name="trash" className="h-4 w-4" /> Quitar
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

/** Buscador simple para tablas */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input type="search" className="input py-2 pl-10" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Celda editable inline (precio / stock) — guarda con Enter o al salir del campo */
export function InlineNumber({ value, onSave, step = '1', prefix = '', min = 0 }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const n = Number(v);
    if (Number.isNaN(n) || n < min || n === value) {
      setEditing(false);
      setV(value);
      return;
    }
    setSaving(true);
    const ok = await onSave(n);
    setSaving(false);
    if (!ok) setV(value);
    setEditing(false);
  };

  if (!editing)
    return (
      <button type="button" className="rounded-lg px-2 py-1 font-bold hover:bg-sky-light" onClick={() => { setV(value); setEditing(true); }} title="Click para editar">
        {prefix}
        {Number(value).toLocaleString('es-AR')}
      </button>
    );
  return (
    <input
      type="number"
      step={step}
      min={min}
      autoFocus
      disabled={saving}
      className="input w-24 px-2 py-1"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setV(value);
          setEditing(false);
        }
      }}
    />
  );
}

/**
 * Acceso directo a WhatsApp con un cliente (abre el chat con un mensaje ya escrito).
 * En las filas clickeables frena el click para no abrir también el detalle.
 */
export function WhatsAppButton({ phone, message = '', label = 'WhatsApp', className = '' }) {
  if (!phone) return null;
  return (
    <a
      href={waLink(phone, message)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Escribirle por WhatsApp"
      aria-label={`Escribir por WhatsApp a ${formatPhone(phone)}`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-mint px-3 py-1.5 text-xs font-extrabold text-petrol-dark transition hover:bg-petrol hover:text-white ${className}`}
    >
      <Icon name="whatsapp" className="h-4 w-4" /> {label}
    </a>
  );
}
