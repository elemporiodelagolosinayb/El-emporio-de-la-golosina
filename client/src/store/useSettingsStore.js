import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

/** Valores por defecto mientras carga (o si la API no responde) */
export const DEFAULT_SETTINGS = {
  businessName: 'El Emporio de la Golosina',
  logoTopbar: null,
  logoMain: null,
  topbarText: 'Tienda mayorista de Golosinas & Más',
  address: 'Av. Aconquija 2030, Yerba Buena, Tucumán',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Aconquija+2030,+Yerba+Buena,+Tucumán',
  schedule: [],
  scheduleText: 'Lunes a Sábado de 8:30 a 13 h y de 17 a 21 h',
  instagram: 'https://www.instagram.com/elemporiodelagolosina.yb/',
  facebook: 'https://www.facebook.com/people/El-Emporio-de-la-Golosina-YB/100063675246746/',
  tiktok: '',
  whatsapp: '5493813495928',
  bank: { alias: '', cbu: '', holder: '', bankName: '' },
  lowStockThreshold: 5,
  minOrderAmount: 0,
  postPurchaseMessage: 'Enviá el comprobante de transferencia por WhatsApp y coordinamos el envío por Uber Moto.',
};

/** Settings públicos cacheados (GET /settings/public) */
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      loadedAt: 0,
      fetch: async (force = false) => {
        // Cache de 5 minutos para no pedirlo en cada navegación
        if (!force && Date.now() - get().loadedAt < 5 * 60 * 1000) return get().settings;
        try {
          const { data } = await api.get('/settings/public');
          set({ settings: { ...DEFAULT_SETTINGS, ...data.settings }, loadedAt: Date.now() });
          return data.settings;
        } catch {
          return get().settings;
        }
      },
      invalidate: () => set({ loadedAt: 0 }),
    }),
    { name: 'emporio-settings' }
  )
);
