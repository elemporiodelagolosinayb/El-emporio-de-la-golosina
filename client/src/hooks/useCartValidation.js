import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useCartStore } from '../store/useCartStore';
import { alertInfo } from '../utils/alerts';

/**
 * Revalida el carrito contra el backend (precios, stock, vigencia de promos)
 * y avisa al cliente si algo cambió.
 */
export function useCartValidation({ auto = true } = {}) {
  const items = useCartStore((s) => s.items);
  const replace = useCartStore((s) => s.replaceFromServer);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  const validate = useCallback(async () => {
    const current = useCartStore.getState().items;
    if (!current.length) {
      setValidated(true);
      return { items: [], issues: [] };
    }
    setValidating(true);
    try {
      const { data } = await api.post('/cart/validate', {
        items: current.map((i) => ({ type: i.type, id: i.id, quantity: i.quantity, price: i.price })),
      });
      replace(data.items);
      if (data.issues.length) {
        await alertInfo('Actualizamos tu carrito', `<ul style="text-align:left">${data.issues.map((i) => `<li>• ${i.msg}</li>`).join('')}</ul>`);
      }
      setValidated(true);
      return data;
    } catch {
      setValidated(true);
      return null;
    } finally {
      setValidating(false);
    }
  }, [replace]);

  useEffect(() => {
    if (auto) validate();
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, validate, validating, validated };
}
