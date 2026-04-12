import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://iznzvrtzijkgklketlkc.supabase.co/functions/v1/telegram-bot/api',
  timeout: 30000,
});

// Helper for admin requests
const getAdminHeaders = () => {
  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return { 'X-User-Id': userId?.toString() || '' };
};

// ── Menu ──────────────────────────────────────────────────
export const getMenu = () => api.get('/menu').then(r => r.data);

// ── Orders ────────────────────────────────────────────────
export const createOrder = (payload) => api.post('/orders', payload).then(r => r.data);

export const uploadPayment = (orderId, file, telegramId) => {
  const form = new FormData();
  form.append('screenshot', file);
  form.append('telegram_id', telegramId);
  return api.post(`/orders/${orderId}/payment`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const getLastOrder = (telegramId) =>
  api.get('/orders/my-last', { params: { telegram_id: telegramId } }).then(r => r.data);

// ── Admin ─────────────────────────────────────────────────
export const getAdminOrders = () => 
  api.get('/admin/orders', { headers: getAdminHeaders() }).then(r => r.data);

export const updateOrderStatus = (id, status) => 
  api.post(`/admin/orders/${id}/status`, { status }, { headers: getAdminHeaders() }).then(r => r.data);

export const toggleSoldOut = (id, is_sold_out) => 
  api.post('/menu/availability', { id, is_sold_out }, { headers: getAdminHeaders() }).then(r => r.data);

export const getAnalytics = () => 
  api.get('/admin/analytics', { headers: getAdminHeaders() }).then(r => r.data);

export const toggleShopStatus = (is_open) => 
  api.post('/settings/toggle', { is_open }, { headers: getAdminHeaders() }).then(r => r.data);

export const triggerBroadcast = (message) => 
  api.post('/broadcast', { message }, { headers: getAdminHeaders() }).then(r => r.data);
