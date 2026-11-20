import api, { unwrap } from './client';

const clean = (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const adminApi = {
  config: () => api.get('/admin/config').then(unwrap),
  stats: (signal) => api.get('/admin/stats', { signal }).then(unwrap),

  products: (params, signal) => api.get('/admin/products', { params: clean(params), signal }).then(unwrap),
  // `form` is a FormData (works with and without image files).
  createProduct: (form) => api.post('/products', form, { timeout: 60000 }).then(unwrap),
  updateProduct: (id, form) => api.put(`/products/${id}`, form, { timeout: 60000 }).then(unwrap),
  setProductActive: (id, isActive) => api.put(`/products/${id}`, { isActive }).then(unwrap),
  deleteProduct: (id) => api.delete(`/products/${id}`).then(unwrap),

  orders: (params, signal) => api.get('/orders', { params: clean(params), signal }).then(unwrap),
  setOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }).then(unwrap),

  users: (params, signal) => api.get('/admin/users', { params: clean(params), signal }).then(unwrap),
  createChatuser: (body) => api.post('/admin/chatusers', body).then(unwrap),
  setUserActive: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }).then(unwrap),
};
