import { formatPrice } from './format';
import { formatPhone } from './phone';
import api from '../api/axios';

/**
 * El cliente tocó "Enviar comprobante por WhatsApp": se confirma el pago automáticamente
 * (solo pedidos con todos los precios). Devuelve el pedido actualizado o null si falló.
 */
export async function markReceiptSent(order) {
  if (order.pricePending || order.status !== 'pendiente_pago') return null;
  try {
    const { data } = await api.post(`/orders/mine/${order.orderNumber}/receipt-sent`);
    return data.order;
  } catch {
    return null; // el WhatsApp se abre igual
  }
}

export const DEFAULT_WHATSAPP = '5493813495928';

/** https://wa.me/549XXXXXXXXXX?text=... (con el 9, formato correcto para celulares de Argentina) */
export function waLink(number, text = '') {
  const n = String(number || DEFAULT_WHATSAPP).replace(/\D/g, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Una línea por producto: "• 2 × Alfajor Jorgito (cód. ALF001) — $ 650 c/u = $ 1.300" */
function orderLine(i) {
  const meta = [i.supplier, i.code && `cód. ${i.code}`].filter(Boolean).join(' · ');
  const code = meta ? ` (${meta})` : '';
  const promo = i.discountPercent > 0 ? ` [-${i.discountPercent}%${i.promotionTitle ? ` ${i.promotionTitle}` : ''}]` : '';
  const price = i.priceToConfirm || !(i.unitPrice > 0) ? 'precio a confirmar' : `${formatPrice(i.unitPrice)} c/u = ${formatPrice(i.subtotal)}`;
  return `• ${i.quantity} × ${i.name}${code}${promo} — ${price}`;
}

/**
 * Mensaje de WhatsApp después de comprar: quién compra, todo el detalle del pedido y el total.
 * Si hay productos con precio a confirmar, pide el total final antes de transferir.
 */
export function waProofMessage(order) {
  const items = order.items || [];
  const units = items.reduce((a, i) => a + i.quantity, 0);
  const pending = order.pricePending || items.some((i) => i.priceToConfirm);
  const lines = [
    `¡Hola! Soy *${order.customerSnapshot?.name}*${order.customerSnapshot?.phone ? ` (cel. ${formatPhone(order.customerSnapshot.phone)})` : ''}.`,
    pending
      ? `Hice el pedido *${order.orderNumber}* en la tienda online. ¿Me confirmás los precios que faltan y el total para transferir?`
      : `Te envío el comprobante de transferencia del pedido *${order.orderNumber}*.`,
    '',
    `🧾 *Detalle del pedido* (${items.length} producto${items.length === 1 ? '' : 's'}, ${units} unidad${units === 1 ? '' : 'es'}):`,
    ...items.map(orderLine),
    '',
    pending
      ? `💰 *Total: ${formatPrice(order.total)}* + productos con precio a confirmar`
      : `💰 *Total transferido: ${formatPrice(order.total)}*`,
  ];
  if (order.notes) lines.push('', `📝 Observaciones: ${order.notes}`);
  lines.push('', '🛵 Coordinamos el envío por Uber Moto por acá. ¡Gracias!');
  return lines.join('\n');
}

export const waForgotPinMessage = (phone) =>
  `¡Hola! Olvidé mi PIN para ingresar a la tienda online. Mi celular registrado es ${phone || '...'}. ¿Me lo pueden resetear?`;

export const waGeneralMessage = () => '¡Hola! Quería hacer una consulta sobre la tienda mayorista.';

export const waProductMessage = (product) =>
  `¡Hola! Quería consultar por "${product.name}"${product.code ? ` (cód. ${product.code})` : ''}.`;

export const waPriceMessage = (product) =>
  `¡Hola! Quería consultar el precio de "${product.name}"${product.code ? ` (cód. ${product.code})` : ''}.`;
