import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the initial session check finishes

  const applySession = useCallback(({ token, user: u }) => {
    if (token) tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    // Other features listen for this to reset per-session state.
    window.dispatchEvent(new Event('app:logout'));
  }, []);

  // Restore the session on page load; any later 401 logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
    });
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = useCallback(async (creds) => applySession(await authApi.login(creds)), [applySession]);
  const register = useCallback(async (data) => applySession(await authApi.register(data)), [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* clear locally even if the request fails */
    }
    clearSession();
  }, [clearSession]);

  const changePassword = useCallback(async (data) => applySession(await authApi.changePassword(data)), [applySession]);

  const updateProfile = useCallback(async (data) => {
    const { user: u } = await authApi.updateProfile(data);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({ user, role: user?.role || null, loading, login, register, logout, changePassword, updateProfile }),
    [user, loading, login, register, logout, changePassword, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
