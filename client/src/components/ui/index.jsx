import { forwardRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';

export { default as Icon } from './Icon';

/** Campo de formulario con label y error debajo */
export const Field = ({ label, error, hint, children, className = '' }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    {error && <p className="field-error">{error}</p>}
  </div>
);

export const Input = forwardRef(({ error, className = '', ...props }, ref) => (
  <input ref={ref} className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ error, className = '', ...props }, ref) => (
  <textarea ref={ref} className={`input min-h-[90px] ${error ? 'input-error' : ''} ${className}`} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ error, className = '', children, ...props }, ref) => (
  <select ref={ref} className={`input ${error ? 'input-error' : ''} ${className}`} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Spinner = ({ className = 'h-6 w-6' }) => (
  <span className={`inline-block animate-spin rounded-full border-[3px] border-sky-light border-t-bubblegum ${className}`} role="status" aria-label="Cargando" />
);

export const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spinner className="h-10 w-10" />
  </div>
);

export const EmptyState = ({ icon = 'box', title, children }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl bg-sky-light/60 px-6 py-12 text-center">
    <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-white text-petrol shadow-card">
      <Icon name={icon} className="h-7 w-7" />
    </span>
    <h3 className="text-xl text-petrol-dark">{title}</h3>
    {children && <div className="mt-2 max-w-md text-gray-600">{children}</div>}
  </div>
);

/** Toggle (switch) accesible */
export const Toggle = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? 'bg-mint' : 'bg-gray-300'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

/** Modal con animación (Framer Motion) */
export function Modal({ open, onClose, title, children, size = 'max-w-lg', footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`flex max-h-[92vh] w-full ${size} flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft sm:rounded-3xl`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-sky-light px-5 py-4">
              <h2 className="text-xl text-petrol-dark">{title}</h2>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-500 hover:bg-sky-light" aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-sky-light bg-cream px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Paginación simple */
/**
 * Paginación: ‹ 1 … 4 5 6 … 20 › + "Página X de Y".
 * Muestra siempre la primera y la última página, y hasta 1 vecina a cada lado.
 */
export function Pagination({ page, pages, onChange, className = 'mt-6' }) {
  if (!pages || pages <= 1) return null;
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const nums = [...set].sort((a, b) => a - b);
  const withGaps = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) withGaps.push(`gap-${n}`);
    withGaps.push(n);
  });
  const go = (n) => onChange(Math.min(pages, Math.max(1, n)));
  const arrow = 'grid h-9 w-9 place-items-center rounded-full bg-white text-petrol shadow-card transition hover:bg-petrol hover:text-white disabled:pointer-events-none disabled:opacity-35';

  return (
    <nav className={`flex flex-col items-center gap-2 ${className}`} aria-label="Paginación">
      <div className="flex items-center gap-1.5">
        <button type="button" className={arrow} disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Página anterior">
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
        {withGaps.map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="px-0.5 text-sm font-bold text-gray-400" aria-hidden="true">…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => go(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-full px-2 text-sm font-extrabold transition ${n === page ? 'bg-bubblegum text-white shadow-[0_6px_14px_-6px_rgba(206,84,135,0.9)]' : 'bg-white text-petrol shadow-card hover:bg-sky-light'}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" className={arrow} disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Página siguiente">
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs font-semibold text-gray-500">
        Página {page} de {pages}
      </p>
    </nav>
  );
}

/** Controles − cantidad + con tope de stock */
export function QuantityInput({ value, onChange, max, min = 1, size = 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  const set = (v) => {
    const n = Math.floor(Number(v) || min);
    onChange(Math.max(min, max != null ? Math.min(n, max) : n));
  };
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-full border-2 border-sky-light bg-white`}>
      <button type="button" className={`${w} ${h} grid place-items-center text-petrol hover:bg-sky-light disabled:opacity-40`} onClick={() => set(value - 1)} disabled={value <= min} aria-label="Restar">
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <input type="number" inputMode="numeric" className="w-12 border-0 bg-transparent text-center font-extrabold focus:outline-none" value={value} min={min} max={max ?? undefined} onChange={(e) => set(e.target.value)} aria-label="Cantidad" />
      <button type="button" className={`${w} ${h} grid place-items-center text-petrol hover:bg-sky-light disabled:opacity-40`} onClick={() => set(value + 1)} disabled={max != null && value >= max} aria-label="Sumar">
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}
