import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Sesión del panel admin (separada de la de clientes) */
export const useAdminStore = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      login: (token, admin) => set({ token, admin }),
      setAdmin: (admin) => set({ admin }),
      logout: () => set({ token: null, admin: null }),
    }),
    { name: 'emporio-admin' }
  )
);
