import { useEffect, useState } from 'react';
import { cld, productImg } from '../../utils/cloudinary';

/**
 * Foto de producto que se adapta a su recuadro según cómo es la foto:
 * - "contain" (la mayoría): producto sobre fondo blanco, o foto que no se puede recortar sin perder
 *   parte del producto → se ve completa sobre blanco, sin el borde blanco sobrante, y se funde con
 *   el fondo blanco del recuadro.
 * - "cover": foto con fondo propio (ej. una bolsa sobre una mesa) y proporción parecida al recuadro
 *   → llena todo el recuadro.
 * El tipo se detecta una sola vez por foto con una miniatura (mirando todo el borde) y se recuerda.
 */
const modeCache = new Map();
const NEAR_WHITE = 230;
const COVER_RATIO = [0.78, 1.3]; // ancho/alto con el que "cover" casi no corta nada

function detectMode(img) {
  const ratio = img.naturalWidth / img.naturalHeight;
  if (ratio < COVER_RATIO[0] || ratio > COVER_RATIO[1]) return 'contain'; // recortarla cortaría el producto
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  // Recorre el borde de la foto: si buena parte es blanco (o transparente), es un producto sobre blanco
  let blank = 0;
  let total = 0;
  for (let i = 0; i < size; i++) {
    for (const [x, y] of [[i, 0], [i, size - 1], [0, i], [size - 1, i]]) {
      const o = (y * size + x) * 4;
      const [r, g, b, a] = [data[o], data[o + 1], data[o + 2], data[o + 3]];
      if (a < 20 || (r >= NEAR_WHITE && g >= NEAR_WHITE && b >= NEAR_WHITE)) blank++;
      total++;
    }
  }
  return blank / total >= 0.35 ? 'contain' : 'cover';
}

/** Detecta (una vez por URL) cómo mostrar la foto */
function usePhotoMode(url) {
  const [mode, setMode] = useState(() => modeCache.get(url) || null);
  useEffect(() => {
    if (modeCache.has(url)) return setMode(modeCache.get(url));
    let alive = true;
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    const done = (m) => {
      modeCache.set(url, m);
      if (alive) setMode(m);
    };
    probe.onload = () => {
      try {
        done(detectMode(probe));
      } catch {
        done('contain'); // si no se puede leer la imagen, se muestra completa sobre blanco
      }
    };
    probe.onerror = () => done('contain');
    probe.src = cld(url, 64);
    return () => {
      alive = false;
    };
  }, [url]);
  return mode;
}

/**
 * props: url, alt, width (px pedidos a Cloudinary), lazy,
 * pad (margen interno cuando la foto se ve completa, ej. "p-2"), className (contenedor), imgClassName (foto)
 */
export default function ProductPhoto({ url, alt = '', width = 500, lazy = true, pad = '', className = '', imgClassName = '' }) {
  const mode = usePhotoMode(url);
  const cover = mode === 'cover';

  return (
    <div className={`relative h-full w-full overflow-hidden bg-white ${className}`}>
      {mode && (
        <img
          src={cover ? cld(url, width) : productImg(url, width)}
          alt={alt}
          loading={lazy ? 'lazy' : undefined}
          className={`h-full w-full ${cover ? 'object-cover' : `object-contain ${pad}`} ${imgClassName}`}
        />
      )}
    </div>
  );
}
