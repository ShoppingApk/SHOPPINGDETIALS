import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const TOKEN_KEY = 'kz_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage blocked: session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // also sends the httpOnly cookie when the browser allows it
  timeout: 25000, // Render's free tier can take a while to wake up
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers a handler so any 401 (expired/invalid session) logs the user out.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthAttempt = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    if (err.response?.status === 401 && !isAuthAttempt && tokenStore.get()) onUnauthorized();
    return Promise.reject(err);
  }
);

// Server responses are { success, message, data }; API helpers return `data`.
export const unwrap = (res) => res.data.data;

export const isCancel = (err) => axios.isCancel(err) || err?.name === 'CanceledError';

// Human-readable message from any API error.
export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message ||
  (err?.code === 'ECONNABORTED' ? 'The server is waking up. Please try again in a moment.' : null) ||
  (err?.request && !err?.response ? 'Cannot reach the server. Check your connection.' : null) ||
  fallback;

// Field errors from a 422 response, as { field: message }.
export const fieldErrors = (err) => {
  const list = err?.response?.data?.data;
  return Array.isArray(list) ? Object.fromEntries(list.map((e) => [e.field.replace(/^address\./, ''), e.message])) : {};
};

export default api;
