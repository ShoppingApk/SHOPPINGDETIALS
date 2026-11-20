import api, { unwrap } from './client';

export const wishlistApi = {
  get: () => api.get('/wishlist').then(unwrap),
  toggle: (productId) => api.post(`/wishlist/${productId}`).then(unwrap),
};
