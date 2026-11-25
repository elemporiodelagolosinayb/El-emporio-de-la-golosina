import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useTitle } from '../hooks';
import PromoCard from '../components/catalog/PromoCard';
import { EmptyState, PageLoader, Pagination } from '../components/ui';
import { usePaged } from '../hooks/usePaged';

export default function Promotions() {
  useTitle('Promociones', { description: 'Promociones y descuentos en golosinas al por mayor en El Emporio de la Golosina, Yerba Buena, Tucumán.' });
  const [state, setState] = useState({ loading: true, items: [] });
  const paged = usePaged(state.items, 6);

  useEffect(() => {
    api
      .get('/promotions')
      .then(({ data }) => setState({ loading: false, items: data.items }))
      .catch(() => setState({ loading: false, items: [] }));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-3xl text-petrol">Promociones</h1>
      {state.loading ? (
        <PageLoader />
      ) : state.items.length === 0 ? (
        <EmptyState icon="tag" title="No hay promociones vigentes">
          Volvé pronto o mirá el catálogo completo.
          <div>
            <Link to="/catalogo" className="btn-primary mt-4">
              Ver catálogo
            </Link>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {paged.items.map((p) => (
            <PromoCard key={p._id} promo={p} />
          ))}
        </div>
      )}
      <Pagination page={paged.page} pages={paged.pages} onChange={(n) => { paged.setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </div>
  );
}
