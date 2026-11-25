const TZ = 'America/Argentina/Buenos_Aires';

const moneyFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatPrice = (n) => moneyFmt.format(Number(n) || 0);

/** ¿Tiene precio publicado? Los que no, se muestran como "Consultar precio" y no se pueden comprar */
export const hasPrice = (product) => Number(product?.finalPrice ?? product?.price) > 0;

/** Precio de un ítem del carrito/pedido: sin precio cargado → "A confirmar" */
export const itemPrice = (n) => (Number(n) > 0 ? formatPrice(n) : 'A confirmar');

/** ¿El producto tiene stock cargado? Si no (0), se vende "a confirmar" sin límite */
export const tracksStock = (product) => Number(product?.stock) > 0;

export const formatDate = (d) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

export const formatDateTime = (d) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(d));

/** Fecha de hoy "YYYY-MM-DD" en hora argentina (para inputs type=date) */
export const todayYMD = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const toYMD = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

export const ORDER_STATUS = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'bg-candy-gold/25 text-ink' },
  pago_confirmado: { label: 'Pago confirmado', cls: 'bg-mint/40 text-petrol-dark' },
  en_preparacion: { label: 'En preparación', cls: 'bg-sky-light text-petrol-dark' },
  entregado: { label: 'Entregado', cls: 'bg-petrol text-white' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-200 text-gray-600' },
};

/** Mensaje de error legible desde una respuesta de axios */
export const errorMessage = (err, fallback = 'Algo salió mal. Probá de nuevo en unos minutos.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'La tienda está tardando en responder. Probá de nuevo.';
  if (err?.message === 'Network Error' || !err?.response) return 'No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.';
  return fallback;
};
