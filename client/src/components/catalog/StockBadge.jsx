import { useSettingsStore } from '../../store/useSettingsStore';

export function stockState(stock, threshold = 5) {
  if (stock <= 0) return 'out';
  if (stock <= threshold) return 'low';
  return 'in';
}

/** Sin stock (gris) · Últimas unidades (candy-gold + ink) · En stock (mint + petrol-dark) */
export default function StockBadge({ stock, className = '' }) {
  const threshold = useSettingsStore((s) => s.settings.lowStockThreshold);
  const state = stockState(stock, threshold);
  const map = {
    out: ['bg-gray-200 text-gray-600', 'Sin stock'],
    low: ['bg-candy-gold text-ink', 'Últimas unidades'],
    in: ['bg-mint text-petrol-dark', 'En stock'],
  };
  const [cls, label] = map[state];
  return <span className={`badge ${cls} ${className}`}>{label}</span>;
}
