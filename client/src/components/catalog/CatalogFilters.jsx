import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import { colorOf, promosLink } from '../../utils/categoryColors';

/** Título de cada bloque del panel */
const Block = ({ icon, title, children, action, hideTitle }) => (
  <div className="border-b border-petrol/10 py-5 first:pt-0 last:border-0 last:pb-0">
    <div className={`mb-3 flex items-center justify-between ${hideTitle ? 'hidden' : ''}`}>
      <p className="flex items-center gap-2 font-display text-base font-semibold text-petrol-dark">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-light text-petrol">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {title}
      </p>
      {action}
    </div>
    {children}
  </div>
);

/**
 * Panel de filtros del catálogo: solo categorías (con la cantidad de productos).
 * Se usa en la columna de la izquierda (escritorio) y en el panel de celular.
 * props: categories, currentSlug, search (query string actual sin "pagina"), onNavigate()
 */
export default function CatalogFilters({ categories, currentSlug, search = '', onNavigate, hideTitle = false }) {
  const cats = categories.filter((c) => c.slug !== 'promos'); // Promos va aparte, primera
  const total = cats.reduce((a, c) => a + (c.productCount || 0), 0);

  const catCls = (active, c) => `flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-sm font-bold transition ${active ? `${c.bg} ${c.text} shadow-card` : 'text-ink hover:bg-sky-light/70'}`;
  const bubble = (active, c) => `grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition ${active ? 'bg-white/30' : c.soft}`;
  const countCls = (active) => `ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold ${active ? 'bg-white/30' : 'bg-sky-light text-petrol'}`;
  const allColor = { bg: 'bg-petrol', text: 'text-white', soft: 'bg-petrol/10' };

  return (
    <div>
      <Block icon="grid" title="Categorías" hideTitle={hideTitle}>
        <ul className="space-y-0.5">
          <li className="pb-1.5">
            <Link
              to={promosLink(categories)}
              onClick={onNavigate}
              className={`flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-sm font-extrabold transition ${currentSlug === 'promos' ? 'bg-gradient-to-r from-bubblegum to-candy-gold text-white shadow-card' : 'bg-bubblegum/10 text-bubblegum hover:bg-bubblegum/15'}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${currentSlug === 'promos' ? 'bg-white/30' : 'bg-white'}`} aria-hidden="true">
                🏷️
              </span>
              Promos
              <Icon name="chevronRight" className="ml-auto h-4 w-4" />
            </Link>
          </li>
          <li>
            <Link to={`/catalogo${search}`} onClick={onNavigate} className={catCls(!currentSlug, allColor)}>
              <span className={bubble(!currentSlug, allColor)} aria-hidden="true">🛍️</span> Todas
              <span className={countCls(!currentSlug)}>{total}</span>
            </Link>
          </li>
          {cats.map((c) => {
            const active = currentSlug === c.slug;
            const cc = colorOf(categories, c.slug);
            return (
              <li key={c._id}>
                <Link to={`/catalogo/${c.slug}${search}`} onClick={onNavigate} className={catCls(active, cc)}>
                  <span className={bubble(active, cc)} aria-hidden="true">{c.icon || '🍬'}</span>
                  <span className="truncate">{c.name}</span>
                  <span className={countCls(active)}>{c.productCount || 0}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Block>
    </div>
  );
}
