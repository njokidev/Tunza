// Shared vocabulary with web/src/lib/constants.js — keep the two in sync so
// both clients send the backend exactly the same values.

export const COMMISSION_RATE = 0.125; // Tunza platform fee

// Terms of Service / Privacy Policy pages live on the web app.
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://tunza-web.onrender.com').replace(/\/$/, '');
export const TERMS_URL = `${WEB_URL}/terms`;
export const PRIVACY_URL = `${WEB_URL}/privacy`;

export const LANGUAGES = ['English', 'Kiswahili', 'Kikuyu', 'Luo', 'Luhya', 'Kalenjin', 'Kamba', 'Kisii', 'Meru', 'Somali'];

// Family onboarding: who is the care for?
export const RELATIONSHIPS = ['Mother', 'Father', 'Grandparent', 'Spouse', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];
export const AGE_GROUPS = [
  { value: 'child',   label: 'Child',   sub: 'Under 18' },
  { value: 'adult',   label: 'Adult',   sub: '18–64' },
  { value: 'elderly', label: 'Elderly', sub: '65+' },
];
export const TAGLINE = 'Quality care, at your doorstep';

// Matches CareRequest.CareRecipient in the backend.
export const CARE_RECIPIENTS = [
  { value: 'elderly',    icon: 'user',            label: 'Elderly parent',         short: 'Elderly care',  hint: 'Daily living support' },
  { value: 'dementia',   icon: 'cloud',           label: 'Person with dementia',   short: 'Dementia',      hint: "Memory care, Alzheimer's" },
  { value: 'surgery',    icon: 'activity',        label: 'Post-surgery recovery',  short: 'Post-surgery',  hint: 'Wound care, mobility' },
  { value: 'disability', icon: 'life-buoy',       label: 'Person with disability', short: 'Disability',    hint: 'Physical or intellectual' },
  { value: 'palliative', icon: 'feather',         label: 'Palliative / end of life', short: 'Palliative',  hint: 'Comfort and dignity' },
  { value: 'chronic',    icon: 'heart',           label: 'Chronic illness',        short: 'Chronic illness', hint: 'Diabetes, stroke, kidney…' },
  { value: 'child',      icon: 'smile',           label: 'A child',                short: 'Childcare',     hint: 'Babysitting, after-school care' },
  { value: 'other',      icon: 'more-horizontal', label: 'Other',                  short: 'Other',         hint: 'Tell us in notes' },
];

// Care types ("What kind of help?"). The names must match the Specialization rows the
// backend seeds (caregivers/migrations/0003) — matching compares them by name.
// `group` decides which section a type shows under; `nurseOnly` types can only be done by
// caregivers whose nursing / CNA certificate Tunza has verified.
export const CARE_TYPE_GROUPS = [
  { key: 'daily',   label: 'Everyday support' },
  { key: 'medical', label: 'Health & recovery' },
  { key: 'family',  label: 'Children & family' },
];
export const CARE_TYPE_META = {
  'elderly care':              { icon: 'user',        group: 'daily',   hint: 'Daily living help for older adults' },
  'personal care':             { icon: 'droplet',     group: 'daily',   hint: 'Bathing, dressing, toileting' },
  'companionship':             { icon: 'coffee',      group: 'daily',   hint: 'Company, walks, errands' },
  'disability support':        { icon: 'life-buoy',   group: 'daily',   hint: 'Physical or intellectual disability' },
  'dementia care':             { icon: 'cloud',       group: 'medical', hint: "Memory care, Alzheimer's" },
  'post-surgery care':         { icon: 'activity',    group: 'medical', hint: 'Wound care, mobility after surgery' },
  'chronic illness care':      { icon: 'heart',       group: 'medical', hint: 'Diabetes, stroke, kidney disease' },
  'palliative care':           { icon: 'feather',     group: 'medical', hint: 'Comfort and dignity at end of life' },
  'medication administration': { icon: 'thermometer', group: 'medical', hint: 'Giving medicines, injections, tracking doses', nurseOnly: true },
  'babysitting':               { icon: 'smile',       group: 'family',  hint: 'Childcare at home, day or evening' },
};
export const careTypeMeta = (name = '') =>
  CARE_TYPE_META[name.trim().toLowerCase()] || { icon: 'heart', group: 'daily', hint: '' };
export const isNurseOnly = (name = '') => !!careTypeMeta(name).nurseOnly;
// Picking a recipient pre-selects the obvious care type (families can change it).
export const RECIPIENT_DEFAULT_CARE = {
  elderly: 'Elderly Care', dementia: 'Dementia Care', surgery: 'Post-surgery Care',
  disability: 'Disability Support', palliative: 'Palliative Care', chronic: 'Chronic Illness Care', child: 'Babysitting',
};

// Used when the backend has no specializations seeded yet.
export const FALLBACK_SPECIALIZATIONS = [
  'Elderly Care', 'Personal Care', 'Companionship', 'Disability Support', 'Dementia Care',
  'Post-surgery Care', 'Chronic Illness Care', 'Palliative Care', 'Medication Administration', 'Babysitting',
].map((name, i) => ({ id: `fallback-${i}`, name, nurse_only: isNurseOnly(name) }));

// Matches Booking.CareType in the backend.
export const BOOKING_CARE_TYPES = [
  { value: 'daycare',    label: 'Day care' },
  { value: 'overnight',  label: 'Overnight care' },
  { value: 'longterm',   label: 'Long-term care' },
  { value: 'postop',     label: 'Post-operative care' },
  { value: 'palliative', label: 'Palliative care' },
];

// Best-effort mapping from a care request to a booking care type.
export const RECIPIENT_TO_CARE_TYPE = {
  elderly: 'daycare', dementia: 'longterm', surgery: 'postop',
  disability: 'longterm', palliative: 'palliative', chronic: 'longterm', child: 'daycare', other: 'daycare',
};

export const SCHEDULE_TYPES = [
  { value: 'one_time',  label: 'One-time',  hint: 'A single visit or short stretch' },
  { value: 'recurring', label: 'Recurring', hint: 'Same days every week' },
  { value: 'live_in',   label: 'Live-in',   hint: 'Caregiver stays at home' },
];

// Backend Availability.Day: Monday = 0 … Sunday = 6
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Weekly availability: tap a shift instead of picking times. end < start = overnight.
export const SHIFT_PRESETS = [
  { key: 'day',       label: 'Daytime',   sub: '8am – 5pm',  start: '08:00', end: '17:00' },
  { key: 'morning',   label: 'Morning',   sub: '6am – 12pm', start: '06:00', end: '12:00' },
  { key: 'afternoon', label: 'Afternoon', sub: '12pm – 6pm', start: '12:00', end: '18:00' },
  { key: 'evening',   label: 'Evening',   sub: '4pm – 10pm', start: '16:00', end: '22:00' },
  { key: 'full',      label: 'Full day',  sub: '6am – 10pm', start: '06:00', end: '22:00' },
  { key: 'overnight', label: 'Overnight', sub: '8pm – 6am',  start: '20:00', end: '06:00' },
];
export const DAY_GROUPS = [
  { label: 'Weekdays',  days: [0, 1, 2, 3, 4] },
  { label: 'Weekends',  days: [5, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

// Verification documents (matches CaregiverDocument.DocType in the backend).
export const VERIFICATION_DOCS = [
  { key: 'id_front',     title: 'National ID — front',          hint: 'A clear photo or scan. All four corners visible.', required: true,  icon: 'credit-card' },
  { key: 'id_back',      title: 'National ID — back',           hint: 'The side with the fingerprint.',                    required: true,  icon: 'credit-card' },
  { key: 'good_conduct', title: 'Certificate of Good Conduct',  hint: 'From eCitizen (DCI). PDF or photo.',                required: true,  icon: 'shield' },
  { key: 'nursing',      title: 'Nursing certificate',          hint: 'Needed for medication administration jobs.',        required: false, icon: 'award' },
  { key: 'cna',          title: 'Certified Nurse Assistant (CNA)', hint: 'Needed for medication administration jobs.',     required: false, icon: 'award' },
];
export const MAX_OTHER_DOCS = 5;

export const VERIFICATION_STATUS = {
  not_submitted: { label: 'Not submitted', bg: '#F3F4F6', fg: '#4B5563' },
  pending:       { label: 'Under review',  bg: '#FFFBEB', fg: '#B45309' },
  approved:      { label: 'Verified',      bg: '#ECFDF5', fg: '#047857' },
  rejected:      { label: 'Needs changes', bg: '#FEF2F2', fg: '#B91C1C' },
};

// How an open job looks to caregivers (CareRequest.JobState in the backend).
export const JOB_STATE = {
  open:    { label: 'Open',    bg: '#ECFDF5', fg: '#047857', icon: 'circle' },
  taken:   { label: 'Taken',   bg: '#F3F4F6', fg: '#4B5563', icon: 'user-check', note: 'Another caregiver got this job.' },
  expired: { label: 'Expired', bg: '#FEF2F2', fg: '#B91C1C', icon: 'clock',      note: 'The start date has passed.' },
  closed:  { label: 'Closed',  bg: '#F3F4F6', fg: '#4B5563', icon: 'x-circle',   note: 'The family closed this request.' },
};

export const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior', sub: '0–2 yrs' },
  { value: 'mid',    label: 'Mid',    sub: '2–5 yrs' },
  { value: 'senior', label: 'Senior', sub: '5+ yrs' },
];

// Hourly budget bands in KES (matching compares against hourly_rate).
export const BUDGET_BANDS = [
  { label: 'Under 400',     min: 0,    max: 400 },
  { label: '400 – 700',     min: 400,  max: 700 },
  { label: '700 – 1,000',   min: 700,  max: 1000 },
  { label: '1,000 – 1,500', min: 1000, max: 1500 },
  { label: 'Flexible',      min: 0,    max: 0 },
];

// Approximate centres for common areas, so matching can use distance.
// `county` groups them in the work-areas picker.
export const AREAS = [
  { name: 'Westlands', lat: -1.2676, lng: 36.8108, county: 'Nairobi' },
  { name: 'Kilimani', lat: -1.2894, lng: 36.7837, county: 'Nairobi' },
  { name: 'Kileleshwa', lat: -1.2806, lng: 36.7836, county: 'Nairobi' },
  { name: 'Lavington', lat: -1.2781, lng: 36.7690, county: 'Nairobi' },
  { name: 'Parklands', lat: -1.2630, lng: 36.8150, county: 'Nairobi' },
  { name: 'Runda', lat: -1.2180, lng: 36.8100, county: 'Nairobi' },
  { name: 'Karen', lat: -1.3197, lng: 36.7076, county: 'Nairobi' },
  { name: "Lang'ata", lat: -1.3420, lng: 36.7570, county: 'Nairobi' },
  { name: 'South B', lat: -1.3100, lng: 36.8380, county: 'Nairobi' },
  { name: 'South C', lat: -1.3180, lng: 36.8250, county: 'Nairobi' },
  { name: 'Donholm', lat: -1.2960, lng: 36.8890, county: 'Nairobi' },
  { name: 'Embakasi', lat: -1.3230, lng: 36.8940, county: 'Nairobi' },
  { name: 'Kasarani', lat: -1.2210, lng: 36.8970, county: 'Nairobi' },
  { name: 'Syokimau', lat: -1.3620, lng: 36.9270, county: 'Machakos' },
  { name: 'Kitengela', lat: -1.4760, lng: 36.9600, county: 'Kajiado' },
  { name: 'Rongai', lat: -1.3960, lng: 36.7440, county: 'Kajiado' },
  { name: 'Ngong', lat: -1.3520, lng: 36.6680, county: 'Kajiado' },
  { name: 'Kikuyu', lat: -1.2460, lng: 36.6630, county: 'Kiambu' },
  { name: 'Kiambu Town', lat: -1.1710, lng: 36.8350, county: 'Kiambu' },
  { name: 'Ruiru', lat: -1.1460, lng: 36.9600, county: 'Kiambu' },
  { name: 'Juja', lat: -1.1020, lng: 37.0140, county: 'Kiambu' },
  { name: 'Thika', lat: -1.0333, lng: 37.0693, county: 'Kiambu' },
];

export const AREA_COUNTIES = ['Nairobi', 'Kiambu', 'Kajiado', 'Machakos'];

export const BOOKING_STATUS = {
  pending:   { label: 'Pending',     bg: '#FFFBEB', fg: '#B45309' },
  accepted:  { label: 'Accepted',    bg: '#F0F9FF', fg: '#0369A1' },
  ongoing:   { label: 'In progress', bg: '#F6F1FC', fg: '#4A0E8F' },
  completed: { label: 'Completed',   bg: '#ECFDF5', fg: '#047857' },
  cancelled: { label: 'Cancelled',   bg: '#F3F4F6', fg: '#4B5563' },
  rejected:  { label: 'Declined',    bg: '#FEF2F2', fg: '#B91C1C' },
};

export const REQUEST_STATUS = {
  open:        { label: 'Open',        bg: '#FFFBEB', fg: '#B45309' },
  matched:     { label: 'Matched',     bg: '#F6F1FC', fg: '#4A0E8F' },
  shortlisted: { label: 'Shortlisted', bg: '#F0F9FF', fg: '#0369A1' },
  booked:      { label: 'Booked',      bg: '#ECFDF5', fg: '#047857' },
  closed:      { label: 'Closed',      bg: '#F3F4F6', fg: '#4B5563' },
  cancelled:   { label: 'Cancelled',   bg: '#F3F4F6', fg: '#4B5563' },
};

export const APPLICATION_STATUS = {
  applied:  { label: 'New',      bg: '#FFFBEB', fg: '#B45309' },
  accepted: { label: 'Accepted', bg: '#ECFDF5', fg: '#047857' },
  rejected: { label: 'Declined', bg: '#F3F4F6', fg: '#6B7280' },
};
