import { useEffect, useMemo, useState } from 'react';

/**
 * Paginación de una lista que ya está en memoria.
 * const { items, page, pages, setPage } = usePaged(lista, 10)
 * Vuelve a la página 1 cuando cambia `resetKey` (ej: un filtro).
 */
export function usePaged(list = [], perPage = 10, resetKey) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(page, pages);

  useEffect(() => setPage(1), [resetKey]);

  const items = useMemo(() => list.slice((current - 1) * perPage, current * perPage), [list, current, perPage]);
  return { items, page: current, pages, setPage, total: list.length };
}
