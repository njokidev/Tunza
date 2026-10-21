import { CARE_RECIPIENTS, BOOKING_CARE_TYPES, COMMISSION_RATE } from './constants';

/** DRF list endpoints are paginated ({results}); a few return plain arrays. */
export const unwrap = (data) => (Array.isArray(data) ? data : data?.results ?? []);

/** Best human-readable message from an axios error (DRF shapes included). */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const d = err?.response?.data;
  if (!err?.response) return 'Cannot reach the Tunza server. Check your connection and API URL.';
  if (typeof d === 'string') return d.length < 200 ? d : fallback;
  if (d?.detail) return String(d.detail);
  if (d && typeof d === 'object') {
    const parts = Object.entries(d).map(([k, v]) => {
      const msg = Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return k === 'non_field_errors' ? msg : `${k.replace(/_/g, ' ')}: ${msg}`;
    });
    if (parts.length) return parts.join('\n');
  }
  return fallback;
}

export const kes = (n) =>
  `KES ${Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Plain formatters (Intl on Hermes varies by build, so keep these explicit).
export const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
export const fmtDay = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return `${WEEKDAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
};
export const fmtTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`;
};
export const fmtShortTime = (t) => (t ? t.slice(0, 5) : ''); // "08:00:00" -> "08:00"

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}

export const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export const recipientLabel = (v) => CARE_RECIPIENTS.find((c) => c.value === v)?.label ?? v;
export const careTypeLabel = (v) => BOOKING_CARE_TYPES.find((c) => c.value === v)?.label ?? v;

export const firstName = (name = '') => (name || '').trim().split(/\s+/)[0] || 'there';

export const initials = (name = '') =>
  (name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'T';

export const caregiverNet = (amount) => Number(amount || 0) * (1 - COMMISSION_RATE);
export const platformFee = (amount) => Number(amount || 0) * COMMISSION_RATE;

/** Mirrors Booking.calculate_amount(): continuous hours between start and end × rate. */
export function estimateAmount(startISO, endISO, rate) {
  const hours = (new Date(endISO) - new Date(startISO)) / 36e5;
  if (!Number.isFinite(hours) || hours <= 0) return { hours: 0, amount: 0 };
  return { hours, amount: hours * Number(rate || 0) };
}

/** yyyy-mm-dd for a Date in the phone's local time. */
export const isoDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const todayISODate = () => isoDate(new Date());
export const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + n));
};

/** Combine a yyyy-mm-dd date and HH:mm time into an ISO string in Nairobi time. */
export const nairobiISO = (date, time) => `${date}T${time}:00+03:00`;

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Haversine distance in km (same formula as care_requests/matching.py). */
export function kmBetween(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Sort open requests nearest-first relative to a caregiver profile. */
export const withDistance = (requests, profile) =>
  requests
    .map((r) => ({ r, d: kmBetween(profile?.latitude, profile?.longitude, r.latitude, r.longitude) }))
    .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
