import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Set EXPO_PUBLIC_API_URL in mobile/.env to your machine's LAN IP when testing
//    on a phone (e.g. http://192.168.0.104:8000/api). Falls back to localhost.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach access token to every request ─────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        const res     = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        const newAccess = res.data.access;
        await SecureStore.setItemAsync('access_token', newAccess);
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        // clear tokens — force re-login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Walk a paginated list with ?page=N. Resolves to { data: [...] } so callers can
 * treat paginated and plain-array endpoints the same way.
 */
async function allPages(url, params = {}, maxPages = 10) {
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await api.get(url, { params: { ...params, page } });
    if (Array.isArray(data)) return { data };
    out.push(...(data.results ?? []));
    if (!data.next) break;
  }
  return { data: out };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data)  => api.post('/auth/register/', data),
  login:    (data)  => api.post('/auth/login/', data),
  logout:   (data)  => api.post('/auth/logout/', data),
  me:       ()      => api.get('/auth/me/'),
  updateMe: (data)  => api.patch('/auth/me/', data),
  notifications: () => api.get('/auth/notifications/'),
  markRead: (id)    => api.patch(`/auth/notifications/${id}/read/`),
};

// ── Caregivers ────────────────────────────────────────────────────────────────
export const caregiverApi = {
  list:             (params) => api.get('/caregivers/', { params }),
  detail:           (id)     => api.get(`/caregivers/${id}/`),
  myProfile:        ()       => api.get('/caregivers/me/'),
  updateMyProfile:  (data)   => api.patch('/caregivers/me/', data),
  me:               ()       => api.get('/caregivers/me/'),
  updateMe:         (data)   => api.patch('/caregivers/me/', data),
  specializations:  ()       => api.get('/caregivers/specializations/'),
  availability:     ()       => api.get('/caregivers/availability/'),
  addAvailability:  (data)   => api.post('/caregivers/availability/', data),
  delAvailability:  (id)     => api.delete(`/caregivers/availability/${id}/`),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingApi = {
  list:         ()          => allPages('/bookings/'),
  create:       (data)      => api.post('/bookings/', data),
  detail:       (id)        => api.get(`/bookings/${id}/`),
  updateStatus: (id, data)  => api.patch(`/bookings/${id}/status/`, data),
  // caregiver: accepted | rejected | ongoing | completed — patient: cancelled
  setStatus:    (id, status) => api.patch(`/bookings/${id}/status/`, { status }),
};

// ── Messaging ─────────────────────────────────────────────────────────────────
export const messageApi = {
  conversations:   ()              => api.get('/messages/'),
  start:           (userId)        => api.post('/messages/start/', { user_id: userId }),
  messages:        (convId)        => api.get(`/messages/${convId}/messages/`),
  send:            (convId, body)  => api.post(`/messages/${convId}/messages/`, { body }),
};

// ── Ratings ───────────────────────────────────────────────────────────────────
export const ratingApi = {
  list:   (caregiverId) => api.get('/ratings/', { params: { caregiver: caregiverId } }),
  create: (data)        => api.post('/ratings/', data),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  initiate: (data)      => api.post('/payments/initiate/', data),
  status:   (bookingId) => api.get(`/payments/status/${bookingId}/`),
};

// ── Locations ─────────────────────────────────────────────────────────────────
export const locationApi = {
  update: (data)      => api.post('/locations/update/', data),
  get:    (bookingId) => api.get(`/locations/booking/${bookingId}/`),
};

// ── Care Requests ─────────────────────────────────────────────────────────────
export const careRequestApi = {
  create:        (d)         => api.post('/care-requests/', d),
  mine:          ()          => allPages('/care-requests/mine/'),
  openRequests:  ()          => api.get('/care-requests/open/'),
  open:          ()          => api.get('/care-requests/open/'),
  matches:       (id)        => api.get(`/care-requests/${id}/matches/`),
  shortlist:     (id, mid)   => api.patch(`/care-requests/${id}/matches/${mid}/shortlist/`),
  bookFromMatch: (id, mid)   => api.post(`/care-requests/${id}/matches/${mid}/book/`),
  apply:         (id, d)     => api.post(`/care-requests/${id}/apply/`, d),
  applications:  (id)        => api.get(`/care-requests/${id}/applications/`),
  acceptApp:     (id, aid)   => api.post(`/care-requests/${id}/applications/${aid}/accept/`),
  rejectApp:     (id, aid)   => api.post(`/care-requests/${id}/applications/${aid}/reject/`),
};
