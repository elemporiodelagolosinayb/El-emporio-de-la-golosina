import api from '../api/axios';

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_MB = 5;

/**
 * Aplica transformaciones de Cloudinary (f_auto,q_auto,w_...) a una URL ya subida.
 * Si no es de Cloudinary, la devuelve tal cual.
 */
export function cld(url, width = 400, { trim = false } = {}) {
  if (!url || !url.includes('/image/upload/')) return url || '';
  // e_trim recorta el borde blanco/transparente sobrante (útil en logos y fotos de producto)
  const t = `${trim ? 'e_trim:10/' : ''}f_auto,q_auto,c_limit,w_${width}`;
  return url.replace('/image/upload/', `/image/upload/${t}/`);
}

/** Foto de producto sin el borde blanco sobrante (para que el producto ocupe el recuadro) */
export const productImg = (url, width = 400) => cld(url, width, { trim: true });

/** Valida tipo y peso de una imagen en el front */
export function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Formato no permitido (solo JPG, PNG o WEBP)';
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `La imagen supera ${MAX_IMAGE_MB} MB`;
  return null;
}

/**
 * Redimensiona/comprime en el navegador antes de subir (ancho máx ~1200px).
 * Los PNG se mantienen en PNG para conservar la transparencia (logos).
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  if (bitmap.width <= maxWidth && file.size < 600 * 1024) return file;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.webp'), { type });
}

/** Pide una firma al back (protegido) */
export async function getSignature(folder) {
  const { data } = await api.post('/admin/cloudinary/signature', { folder });
  return data;
}

/**
 * Sube una imagen DIRECTO a Cloudinary con subida firmada (no pasa por el backend).
 * @returns {Promise<{ url, public_id }>}
 */
export async function uploadToCloudinary(file, folder = 'emporio/productos', { signature, onProgress, maxWidth = 1200 } = {}) {
  const sig = signature || (await getSignature(folder));
  const compressed = await compressImage(file, maxWidth);
  const form = new FormData();
  form.append('file', compressed);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', sig.timestamp);
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const cloud = sig.cloudName || CLOUD;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve({ url: res.secure_url, public_id: res.public_id });
      else reject(new Error(res.error?.message || 'Error subiendo la imagen'));
    };
    xhr.onerror = () => reject(new Error('Error de red subiendo la imagen'));
    xhr.send(form);
  });
}
