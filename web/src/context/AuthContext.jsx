import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokens, setSessionExpiredHandler } from '../api/client';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export const homeFor = (role) =>
  role === 'caregiver' ? '/caregiver' : role === 'patient' ? '/patient' : role === 'admin' ? '/admin' : '/unsupported';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      navigate('/login', { replace: true, state: { expired: true } });
    });
  }, [navigate]);

  // Restore the session from stored tokens on first load.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tokens.access && !tokens.refresh) { setBooting(false); return; }
      try {
        const { data } = await authApi.me();
        if (alive) setUser(data);
      } catch {
        tokens.clear();
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email.trim().toLowerCase(), password);
    tokens.set(data);
    const me = data.user ?? (await authApi.me()).data;
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    await authApi.register({ ...payload, email: payload.email.trim().toLowerCase() });
    return login(payload.email, payload.password);
  }, [login]);

  const logout = useCallback(async () => {
    const { refresh, access } = { refresh: tokens.refresh, access: tokens.access };
    tokens.clear();
    setUser(null);
    navigate('/login', { replace: true });
    if (refresh) authApi.logout(refresh, access).catch(() => {}); // blacklists the refresh token
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, booting, login, register, logout, refreshUser, setUser }),
    [user, booting, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
