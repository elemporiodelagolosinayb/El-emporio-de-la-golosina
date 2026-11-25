import api from '../api/axios';

/**
 * Columnas de la planilla de productos (en este orden, iguales a las del server).
 * El importador también acepta los encabezados viejos: "Código/ID", "Producto", "Marca"…
 */
export const HEADERS = ['codigo', 'nombre', 'categoria', 'proveedor', 'precio', 'stock', 'activo', 'revisar', 'nota_revision'];

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Descarga la planilla de productos (.xlsx) que arma el server:
 * hoja "Productos" con encabezado fijo, autofiltro, desplegables y filas "para revisar" en amarillo,
 * + hoja "Referencias" con las categorías y proveedores actuales.
 */
export async function downloadProductsSheet() {
  let data;
  try {
    ({ data } = await api.get('/admin/products/export', { responseType: 'blob' }));
  } catch (err) {
    // Con responseType "blob" el error JSON del server llega como Blob: lo leemos para mostrar el mensaje
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* se muestra el mensaje genérico */
      }
    }
    throw err;
  }
  download(data, `productos-emporio-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
