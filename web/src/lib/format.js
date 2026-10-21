import { CARE_RECIPIENTS, BOOKING_CARE_TYPES, COMMISSION_RATE } from './constants';

export const kes = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' }) : '';

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

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'T';

export const caregiverNet = (amount) => Number(amount || 0) * (1 - COMMISSION_RATE);
export const platformFee = (amount) => Number(amount || 0) * COMMISSION_RATE;

/** Mirrors Booking.calculate_amount(): continuous hours between start and end × rate. */
export function estimateAmount(startISO, endISO, rate) {
  const hours = (new Date(endISO) - new Date(startISO)) / 36e5;
  if (!Number.isFinite(hours) || hours <= 0) return { hours: 0, amount: 0 };
  return { hours, amount: hours * Number(rate || 0) };
}

/** Combine a yyyy-mm-dd date and HH:mm time into an ISO string in Nairobi time. */
export const nairobiISO = (date, time) => `${date}T${time}:00+03:00`;

export const todayISODate = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

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
