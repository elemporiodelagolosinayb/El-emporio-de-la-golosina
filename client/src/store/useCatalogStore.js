import { create } from 'zustand';
import api from '../api/axios';

/** Categorías y proveedores públicos, compartidos entre header, home y catálogo (cache 2 min) */
export const useCatalogStore = create((set, get) => ({
  categories: [],
  suppliers: [],
  loadedAt: 0,
  fetch: async (force = false) => {
    if (!force && Date.now() - get().loadedAt < 2 * 60 * 1000) return;
    set({ loadedAt: Date.now() });
    // all=true: se muestran todas las categorías y marcas activas, aunque todavía no tengan productos
    const [c, s] = await Promise.allSettled([api.get('/categories', { params: { all: 'true' } }), api.get('/suppliers', { params: { all: 'true' } })]);
    set({
      categories: c.value?.data.items || get().categories,
      suppliers: s.value?.data.items || get().suppliers,
    });
  },
}));
