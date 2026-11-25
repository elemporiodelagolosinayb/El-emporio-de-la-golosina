import { useEffect, useRef, useState } from 'react';

/** Devuelve el valor con retardo (buscador con debounce) */
export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Llama a onIntersect cuando el elemento centinela entra en pantalla (scroll infinito) */
export function useInfiniteScroll(onIntersect, enabled) {
  const ref = useRef(null);
  const cb = useRef(onIntersect);
  cb.current = onIntersect;
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const obs = new IntersectionObserver((entries) => entries[0].isIntersecting && cb.current(), { rootMargin: '400px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [enabled]);
  return ref;
}

/** Título de la pestaña */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | El Emporio de la Golosina` : 'El Emporio de la Golosina | Mayorista en Yerba Buena';
  }, [title]);
}
