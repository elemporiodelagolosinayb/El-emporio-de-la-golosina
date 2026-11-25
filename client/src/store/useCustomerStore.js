import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Sesión del cliente (acceso con celular + PIN, token de 30 días) */
export const useCustomerStore = create(
  persist(
    (set) => ({
      token: null,
      customer: null,
      login: (token, customer) => set({ token, customer }),
      logout: () => set({ token: null, customer: null }),
    }),
    { name: 'emporio-customer' }
  )
);
