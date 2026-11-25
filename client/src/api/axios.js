import axios from 'axios';
import { useAdminStore } from '../store/useAdminStore';
import { useCustomerStore } from '../store/useCustomerStore';

/** Instancia centralizada de Axios */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 60000,
});

const isAdminUrl = (url = '') => url.startsWith('/admin');

// Adjunta el token que corresponda: admin para /admin/*, cliente para el resto
api.interceptors.request.use((config) => {
  const token = isAdminUrl(config.url) ? useAdminStore.getState().token : useCustomerStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo central de 401: cierra la sesión que corresponda
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401) {
      if (isAdminUrl(url) && !url.includes('/auth/login')) {
        useAdminStore.getState().logout();
        if (window.location.pathname !== '/ingresar') window.location.assign('/ingresar?modo=admin');
      } else if (!isAdminUrl(url) && !url.startsWith('/auth/') && useCustomerStore.getState().token) {
        useCustomerStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
