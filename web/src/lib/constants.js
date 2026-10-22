export const COMMISSION_RATE = 0.125; // Tunza platform fee
export const TAGLINE = 'Quality care, at your doorstep';

// Matches CareRequest.CareRecipient in the backend.
export const CARE_RECIPIENTS = [
  { value: 'elderly', label: 'Elderly parent', hint: 'Daily living support' },
  { value: 'dementia', label: 'Person with dementia', hint: "Memory care, Alzheimer's" },
  { value: 'surgery', label: 'Post-surgery recovery', hint: 'Wound care, mobility' },
  { value: 'disability', label: 'Person with disability', hint: 'Physical or intellectual' },
  { value: 'palliative', label: 'Palliative / end of life', hint: 'Comfort and dignity' },
  { value: 'chronic', label: 'Chronic illness', hint: 'Diabetes, stroke, kidney…' },
  { value: 'child', label: 'A child', hint: 'Babysitting, after-school care' },
  { value: 'other', label: 'Other', hint: 'Tell us in notes' },
];

// Used when the backend has no specializations seeded yet.
// Names must match the Specialization rows seeded by caregivers/migrations/0003.
export const FALLBACK_SPECIALIZATIONS = [
  'Elderly Care', 'Personal Care', 'Companionship', 'Disability Support', 'Dementia Care',
  'Post-surgery Care', 'Chronic Illness Care', 'Palliative Care', 'Medication Administration', 'Babysitting',
].map((name, i) => ({ id: `fallback-${i}`, name, nurse_only: name === 'Medication Administration' }));

// Matches Booking.CareType in the backend.
export const BOOKING_CARE_TYPES = [
  { value: 'daycare', label: 'Day care' },
  { value: 'overnight', label: 'Overnight care' },
  { value: 'longterm', label: 'Long-term care' },
  { value: 'postop', label: 'Post-operative care' },
  { value: 'palliative', label: 'Palliative care' },
];

// Best-effort mapping from a care request to a booking care type.
export const RECIPIENT_TO_CARE_TYPE = {
  elderly: 'daycare', dementia: 'longterm', surgery: 'postop',
  disability: 'longterm', palliative: 'palliative', chronic: 'longterm', child: 'daycare', other: 'daycare',
};

export const SCHEDULE_TYPES = [
  { value: 'one_time', label: 'One-time', hint: 'A single visit or short stretch' },
  { value: 'recurring', label: 'Recurring', hint: 'Same days every week' },
  { value: 'live_in', label: 'Live-in', hint: 'Caregiver stays at home' },
];

// Backend Availability.Day: Monday = 0 … Sunday = 6
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0–2 yrs)' },
  { value: 'mid', label: 'Mid (2–5 yrs)' },
  { value: 'senior', label: 'Senior (5+ yrs)' },
];

// Hourly budget bands in KES (matching compares against hourly_rate).
export const BUDGET_BANDS = [
  { label: 'Under 400', min: 0, max: 400 },
  { label: '400 – 700', min: 400, max: 700 },
  { label: '700 – 1,000', min: 700, max: 1000 },
  { label: '1,000 – 1,500', min: 1000, max: 1500 },
  { label: 'Flexible', min: 0, max: 0 },
];

// Approximate centres for common areas, so matching can use distance.
export const AREAS = [
  { name: 'Westlands', lat: -1.2676, lng: 36.8108 },
  { name: 'Kilimani', lat: -1.2894, lng: 36.7837 },
  { name: 'Kileleshwa', lat: -1.2806, lng: 36.7836 },
  { name: 'Lavington', lat: -1.2781, lng: 36.7690 },
  { name: 'Parklands', lat: -1.2630, lng: 36.8150 },
  { name: 'Runda', lat: -1.2180, lng: 36.8100 },
  { name: 'Karen', lat: -1.3197, lng: 36.7076 },
  { name: "Lang'ata", lat: -1.3420, lng: 36.7570 },
  { name: 'South B', lat: -1.3100, lng: 36.8380 },
  { name: 'South C', lat: -1.3180, lng: 36.8250 },
  { name: 'Donholm', lat: -1.2960, lng: 36.8890 },
  { name: 'Embakasi', lat: -1.3230, lng: 36.8940 },
  { name: 'Kasarani', lat: -1.2210, lng: 36.8970 },
  { name: 'Syokimau', lat: -1.3620, lng: 36.9270 },
  { name: 'Kitengela', lat: -1.4760, lng: 36.9600 },
  { name: 'Rongai', lat: -1.3960, lng: 36.7440 },
  { name: 'Ngong', lat: -1.3520, lng: 36.6680 },
  { name: 'Kikuyu', lat: -1.2460, lng: 36.6630 },
  { name: 'Kiambu Town', lat: -1.1710, lng: 36.8350 },
  { name: 'Ruiru', lat: -1.1460, lng: 36.9600 },
  { name: 'Juja', lat: -1.1020, lng: 37.0140 },
  { name: 'Thika', lat: -1.0333, lng: 37.0693 },
];

export const BOOKING_STATUS = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Accepted', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ongoing: { label: 'In progress', className: 'bg-brand-50 text-brand-700 ring-brand-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
  rejected: { label: 'Declined', className: 'bg-red-50 text-red-700 ring-red-200' },
};

export const REQUEST_STATUS = {
  open: { label: 'Open', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  matched: { label: 'Matched', className: 'bg-brand-50 text-brand-700 ring-brand-200' },
  shortlisted: { label: 'Shortlisted', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  booked: { label: 'Booked', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
};
