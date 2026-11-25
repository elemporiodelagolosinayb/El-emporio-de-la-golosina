import cloudinary from '../config/cloudinary.js';
import env from '../config/env.js';

const ALLOWED_FOLDERS = ['emporio/productos', 'emporio/promociones', 'emporio/logos', 'emporio/proveedores', 'emporio/home'];

/**
 * Firma para subida directa desde el front (las imágenes NO pasan por el backend,
 * así evitamos el límite de ~4.5 MB del body en Vercel).
 */
function signUpload(folder) {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  return {
    signature,
    timestamp,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}

/** Borra una imagen (silencioso si falla: no debe romper la operación principal) */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('No se pudo borrar la imagen de Cloudinary', publicId, err.message);
  }
}

/** Borra muchas imágenes en lotes de 100 */
async function deleteImages(publicIds = []) {
  const ids = publicIds.filter(Boolean);
  for (let i = 0; i < ids.length; i += 100) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100));
    } catch (err) {
      console.error('Error borrando imágenes de Cloudinary', err.message);
    }
  }
}

export { signUpload, deleteImage, deleteImages, ALLOWED_FOLDERS };
