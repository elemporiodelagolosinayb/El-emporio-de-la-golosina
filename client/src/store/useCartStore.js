import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Carrito persistido en localStorage.
 * Ítem: { type: 'product'|'promotion', id, name, price, image, slug, supplier, quantity, maxStock (null = sin límite) }
 */
const keyOf = (type, id) => `${type}:${id}`;
const clamp = (q, max) => Math.max(1, max === null || max === undefined ? q : Math.min(q, max));

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      /** Agrega (o suma) respetando el stock disponible. Devuelve la cantidad final. */
      add: (item, quantity = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => keyOf(i.type, i.id) === keyOf(item.type, item.id));
        let finalQty;
        if (idx >= 0) {
          finalQty = clamp(items[idx].quantity + quantity, item.maxStock ?? items[idx].maxStock);
          items[idx] = { ...items[idx], ...item, quantity: finalQty };
        } else {
          finalQty = clamp(quantity, item.maxStock);
          items.push({ ...item, quantity: finalQty });
        }
        set({ items });
        return finalQty;
      },

      setQuantity: (type, id, quantity) =>
        set({
          items: get().items.map((i) => (keyOf(i.type, i.id) === keyOf(type, id) ? { ...i, quantity: clamp(quantity, i.maxStock) } : i)),
        }),

      remove: (type, id) => set({ items: get().items.filter((i) => keyOf(i.type, i.id) !== keyOf(type, id)) }),

      clear: () => set({ items: [] }),

      /** Reemplaza el carrito con lo que devolvió POST /cart/validate */
      replaceFromServer: (serverItems) =>
        set({
          items: serverItems.map((i) => ({
            type: i.type,
            id: i.id,
            name: i.name,
            price: i.price,
            listPrice: i.listPrice ?? i.price,
            discountPercent: i.discountPercent || 0,
            image: i.image,
            slug: i.slug,
            supplier: i.supplier,
            quantity: i.quantity,
            maxStock: i.maxStock,
          })),
        }),

      quantityOf: (type, id) => get().items.find((i) => keyOf(i.type, i.id) === keyOf(type, id))?.quantity || 0,
    }),
    { name: 'emporio-cart', partialize: (s) => ({ items: s.items }) }
  )
);

export const cartCount = (items) => items.reduce((a, i) => a + i.quantity, 0);
/** ¿Hay productos con precio a confirmar? (el mínimo de compra no se controla en ese caso, igual que en el back) */
export const cartPricePending = (items) => items.some((i) => !(Number(i.price) > 0));

export const cartTotal = (items) => Math.round(items.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100;

/**
 * Producto que alguien quiso comprar sin haber ingresado: se guarda en la pestaña
 * y se agrega al carrito apenas ingresa (lo hace PublicLayout).
 */
const PENDING_KEY = 'emporio-pending-add';
export function savePendingAdd(item, quantity) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ item, quantity }));
  } catch {
    /* sin almacenamiento: después de ingresar lo agrega a mano */
  }
}
export function takePendingAdd() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
