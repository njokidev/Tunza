import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from '../lib/secureStore';
import { authApi, onSessionExpired } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          const { data } = await authApi.me();
          setUser(data);
        }
      } catch {
        await _clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    await SecureStore.setItemAsync('access_token',  data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  // If the server can't refresh the session any more, drop back to the login screen
  // instead of leaving the app "signed in" with every request failing.
  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const logout = useCallback(async () => {
    // Sign out on the phone first so the button always works, even offline or with
    // the backend asleep; then tell the server to revoke the token in the background.
    let refresh = null;
    try { refresh = await SecureStore.getItemAsync('refresh_token'); } catch { /* ignore */ }
    try { await _clearTokens(); } catch { /* ignore */ }
    setUser(null);
    if (refresh) authApi.logout({ refresh }).catch(() => {});
  }, []);

  const updateUser = useCallback((patch) => {
    setUser(prev => ({ ...prev, ...patch }));
  }, []);

  // Re-read the account from the server (e.g. after a caregiver setup step, so the
  // navigator moves on to the next screen).
  const refreshUser = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const _clearTokens = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
