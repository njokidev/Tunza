import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

const ACCESS_KEY = 'tunza.access';
const REFRESH_KEY = 'tunza.refresh';

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

// AuthContext registers this so a dead session sends the user back to login.
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

api.interceptors.request.use((config) => {
  const access = tokens.access;
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// One refresh in flight at a time; concurrent 401s wait on the same promise.
// Backend rotates refresh tokens (ROTATE_REFRESH_TOKENS), so store both.
let refreshing = null;

function refreshAccessToken() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/auth/token/refresh/`, { refresh: tokens.refresh })
      .then(({ data }) => { tokens.set(data); return data.access; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/register') || url.includes('/auth/token/refresh');

    if (status !== 401 || isAuthCall) return Promise.reject(error);

    if (original._retry || !tokens.refresh) {
      tokens.clear();
      onSessionExpired();
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const access = await refreshAccessToken();
      original.headers = { ...original.headers, Authorization: `Bearer ${access}` };
      return api(original);
    } catch {
      tokens.clear();
      onSessionExpired();
      return Promise.reject(error);
    }
  }
);

/** Turn a DRF error payload into one readable sentence. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) {
    return 'Cannot reach the Tunza server. Make sure Django is running on port 8000.';
  }
  const data = err.response.data;
  if (err.response.status >= 500) return 'The server hit an error. Check the Django console for details.';
  if (!data) return fallback;
  if (typeof data === 'string') return data.length < 200 ? data : fallback;
  if (data.detail) return data.detail;
  const parts = Object.entries(data).map(([field, val]) => {
    const msg = Array.isArray(val) ? val.join(' ') : typeof val === 'object' ? JSON.stringify(val) : String(val);
    return field === 'non_field_errors' ? msg : `${field.replace(/_/g, ' ')}: ${msg}`;
  });
  return parts.join(' • ') || fallback;
}
