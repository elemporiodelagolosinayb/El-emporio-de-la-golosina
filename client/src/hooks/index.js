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

const SITE_NAME = 'El Emporio de la Golosina';
const DEFAULT_TITLE = 'El Emporio de la Golosina | Mayorista de golosinas en Yerba Buena, Tucumán';
/** Imagen para compartir el link (logo sobre el celeste de la marca, 1200×630) — la misma que index.html */
const DEFAULT_IMAGE =
  'https://res.cloudinary.com/nkh8qenb/image/upload/e_trim:10/c_fit,w_860,h_400/c_pad,w_1200,h_630,b_rgb:589AD6/f_jpg,q_auto/v1794875095/emporio/logos/ituptqhuygdcwxxuirww.png';
export const DEFAULT_DESCRIPTION =
  'Distribuidora mayorista de golosinas en Yerba Buena, Tucumán. Alfajores, chocolates, caramelos, galletas y snacks de las mejores marcas. Pedí online y coordinamos el envío por WhatsApp.';

/** Crea o actualiza un <meta> del <head> (name="description", property="og:title", …) */
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Título de la pestaña + datos para buscadores y para cuando se comparte el link
 * (descripción, Open Graph, Twitter y dirección canónica de la página).
 * options: { description, image, noindex }
 */
export function useTitle(title, { description, image, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 300);
    const url = `${window.location.origin}${window.location.pathname}`;
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    // Sin imagen propia se vuelve a la del logo (si no, quedaría la del último producto visto)
    setMeta('property', 'og:image', image || DEFAULT_IMAGE);
    setMeta('name', 'twitter:image', image || DEFAULT_IMAGE);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, image, noindex]);
}
