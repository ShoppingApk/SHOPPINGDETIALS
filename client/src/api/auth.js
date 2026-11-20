import api, { unwrap } from './client';

export const authApi = {
  register: (body) => api.post('/auth/register', body).then(unwrap),
  login: (body) => api.post('/auth/login', body).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  changePassword: (body) => api.put('/auth/password', body).then(unwrap),
  updateProfile: (body) => api.put('/users/profile', body).then(unwrap),
};
