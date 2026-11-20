import api, { unwrap } from './client';

export const ordersApi = {
  place: (body) => api.post('/orders', { paymentMethod: 'COD', ...body }).then(unwrap),
  mine: (page = 1, signal) => api.get('/orders/my', { params: { page }, signal }).then(unwrap),
  get: (id, signal) => api.get(`/orders/${id}`, { signal }).then(unwrap),
  cancel: (id) => api.put(`/orders/${id}/cancel`).then(unwrap),
};

export const addressApi = {
  list: () => api.get('/users/addresses').then(unwrap),
  create: (body) => api.post('/users/addresses', body).then(unwrap),
  update: (id, body) => api.put(`/users/addresses/${id}`, body).then(unwrap),
  remove: (id) => api.delete(`/users/addresses/${id}`).then(unwrap),
};
