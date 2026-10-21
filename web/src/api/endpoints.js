import { api } from './client';

/** DRF list endpoints are paginated ({results}); a few return plain arrays. */
export const unwrap = (data) => (Array.isArray(data) ? data : data?.results ?? []);

/**
 * Walk a paginated list with ?page=N (DRF's absolute `next` URL points at Django
 * directly, which would bypass the dev proxy). Resolves to { data: [...] }.
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

export const authApi = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (payload) => api.post('/auth/register/', payload),
  logout: (refresh, access) =>
    api.post('/auth/logout/', { refresh }, { headers: access ? { Authorization: `Bearer ${access}` } : {} }),
  me: () => api.get('/auth/me/'),
  updateMe: (payload) => api.patch('/auth/me/', payload),
  notifications: () => api.get('/auth/notifications/'),
};

export const caregiverApi = {
  list: (params) => api.get('/caregivers/', { params }),
  get: (id) => api.get(`/caregivers/${id}/`),
  me: () => api.get('/caregivers/me/'),
  updateMe: (payload) => api.patch('/caregivers/me/', payload),
  specializations: () => api.get('/caregivers/specializations/'),
  availability: () => api.get('/caregivers/availability/'),
  addAvailability: (payload) => api.post('/caregivers/availability/', payload),
  removeAvailability: (id) => api.delete(`/caregivers/availability/${id}/`),
};

export const bookingApi = {
  list: () => allPages('/bookings/'),
  get: (id) => api.get(`/bookings/${id}/`),
  create: (payload) => api.post('/bookings/', payload),
  // caregiver: accepted | rejected | ongoing | completed — patient: cancelled
  setStatus: (id, status, notes) =>
    api.patch(`/bookings/${id}/status/`, notes === undefined ? { status } : { status, notes }),
};

export const careRequestApi = {
  create: (payload) => api.post('/care-requests/', payload),
  mine: () => allPages('/care-requests/mine/'),
  open: () => api.get('/care-requests/open/'),
  matches: (id) => api.get(`/care-requests/${id}/matches/`),
  shortlist: (id, matchId) => api.patch(`/care-requests/${id}/matches/${matchId}/shortlist/`),
  apply: (id, payload) => api.post(`/care-requests/${id}/apply/`, payload),
  applications: (id) => api.get(`/care-requests/${id}/applications/`),
  rejectApplication: (id, appId) => api.post(`/care-requests/${id}/applications/${appId}/reject/`),
};

export const messageApi = {
  conversations: () => api.get('/messages/'),
  start: (userId) => api.post('/messages/start/', { user_id: userId }),
  list: (convId, page) => api.get(`/messages/${convId}/messages/`, { params: page ? { page } : undefined }),
  /** Messages are oldest-first and paginated, so fetch the last two pages for recent history. */
  async recent(convId, pageSize = 20) {
    const first = (await api.get(`/messages/${convId}/messages/`)).data;
    if (Array.isArray(first) || !first.next) return unwrap(first);
    const last = Math.ceil(first.count / pageSize);
    const pages = await Promise.all(
      [last - 1, last].filter((p) => p >= 1).map((p) =>
        p === 1 ? Promise.resolve({ data: first }) : api.get(`/messages/${convId}/messages/`, { params: { page: p } }))
    );
    return pages.flatMap((r) => unwrap(r.data));
  },
  send: (convId, body) => api.post(`/messages/${convId}/messages/`, { body }),
};

export const ratingApi = {
  create: (payload) => api.post('/ratings/', payload),
};

export const paymentApi = {
  status: (bookingId) => api.get(`/payments/status/${bookingId}/`),
};

/** Admin-only endpoints (/api/admin/). Lists are paginated: { count, next, results }. */
export const adminApi = {
  overview: (days = 30) => api.get('/admin/overview/', { params: { days } }),
  caregivers: (params) => api.get('/admin/caregivers/', { params }),
  users: (params) => api.get('/admin/users/', { params }),
  userAction: (userId, action, reason) => api.patch(`/admin/users/${userId}/`, { action, reason }),
  bookings: (params) => api.get('/admin/bookings/', { params }),
  setBookingStatus: (id, status, notes) =>
    api.patch(`/bookings/${id}/status/`, notes ? { status, notes } : { status }),
  payoutsDue: () => api.get('/admin/payouts/due/'),
  payouts: (params) => api.get('/admin/payouts/', { params }),
  recordPayout: (payload) => api.post('/admin/payouts/', payload),
};
