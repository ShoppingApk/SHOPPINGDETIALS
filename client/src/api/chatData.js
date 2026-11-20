import api, { unwrap } from './client';

// Private messaging REST calls. Imported only by the lazily loaded chat module, so this code
// is never downloaded by normal shoppers.
export const chatApi = {
  config: () => api.get('/chat/config').then(unwrap),
  iceServers: () => api.get('/chat/ice-servers').then(unwrap),
  users: (q, signal) => api.get('/chat/users', { params: q ? { q } : {}, signal }).then(unwrap),
  conversations: () => api.get('/chat/conversations').then(unwrap),
  open: (userId) => api.post('/chat/conversations', { userId }).then(unwrap),
  messages: (id, params = {}) => api.get(`/chat/conversations/${id}/messages`, { params }).then(unwrap),
  upload: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/chat/upload', fd, { timeout: 60000 }).then(unwrap);
  },
  remove: (id, scope) => api.delete(`/chat/messages/${id}`, { params: { scope } }).then(unwrap),
};
