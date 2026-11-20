import api, { unwrap } from './client';

export const cartApi = {
  get: () => api.get('/cart').then(unwrap),
  add: ({ productId, size, color, quantity = 1 }) => api.post('/cart', { productId, size, color, quantity }).then(unwrap),
  update: (itemId, quantity) => api.patch(`/cart/${itemId}`, { quantity }).then(unwrap),
  remove: (itemId) => api.delete(`/cart/${itemId}`).then(unwrap),
  clear: () => api.delete('/cart').then(unwrap),
};
