import api, { unwrap } from './client';

// Drops empty values so URLs stay clean.
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const productsApi = {
  list: (params, signal) => api.get('/products', { params: clean(params), signal }).then(unwrap),
  get: (id, signal) => api.get(`/products/${id}`, { signal }).then(unwrap),
  categories: () => api.get('/products/categories').then(unwrap),
  filters: (category, signal) => api.get('/products/filters', { params: clean({ category }), signal }).then(unwrap),
  similar: (id, signal) => api.get(`/products/${id}/similar`, { signal }).then(unwrap),
  reviews: (id, page = 1) => api.get(`/products/${id}/reviews`, { params: { page } }).then(unwrap),
  addReview: (id, body) => api.post(`/products/${id}/reviews`, body).then(unwrap),
  // Top 5 product titles for search suggestions.
  suggest: (q, signal) =>
    api.get('/products', { params: { q, limit: 5 }, signal }).then((r) => unwrap(r).products),
};
