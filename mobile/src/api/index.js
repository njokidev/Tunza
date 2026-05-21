import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
export const BASE_URL = RAW_API_URL.replace(/\/$/, '');

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
  specializations:  ()       => api.get('/caregivers/specializations/'),
  availability:     ()       => api.get('/caregivers/availability/'),
  addAvailability:  (data)   => api.post('/caregivers/availability/', data),
  delAvailability:  (id)     => api.delete(`/caregivers/availability/${id}/`),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingApi = {
  list:         ()          => api.get('/bookings/'),
  create:       (data)      => api.post('/bookings/', data),
  detail:       (id)        => api.get(`/bookings/${id}/`),
  updateStatus: (id, data)  => api.patch(`/bookings/${id}/status/`, data),
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
