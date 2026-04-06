import axios from 'axios';

const api = axios.create({
  baseURL: 'https://adammardanov-tashkent-cafe-bot.hf.space/api',
  timeout: 30000,
});

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
export const getAdminOrders = () => api.get('/admin/orders').then(r => r.data);
export const updateOrderStatus = (id, status) => api.put(`/admin/orders/${id}/status`, { status }).then(r => r.data);
export const toggleSoldOut = (id, is_sold_out) => api.put(`/admin/menu/${id}/sold-out`, { is_sold_out }).then(r => r.data);
export const getAnalytics = () => api.get('/admin/analytics').then(r => r.data);
