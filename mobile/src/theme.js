// ─── Tunza Design System ──────────────────────────────────────────────────────
// Mirrors the web app (web/tailwind.config.js → brand palette) so both clients
// look like one product. Every color, shadow, radius and spacing value in the
// app comes from here — never hardcoded in screens.

export const BRAND = {
  50: '#F6F1FC', 100: '#ECE1F8', 200: '#D6C0F0', 300: '#B796E4',
  400: '#8F5FD3', 500: '#6B30BA', 600: '#5A1CA5', 700: '#4A0E8F',
  800: '#3A0B70', 900: '#2A0852',
};

export const COLORS = {
  // ── Primary purple (web brand-700) ───────────────────────────
  primary:       BRAND[700],  // buttons, active tabs, accents
  primaryDark:   BRAND[800],  // pressed states, headings on tint
  primaryMid:    BRAND[500],  // soft accents
  primaryLight:  BRAND[100],  // chip fills
  primaryXLight: BRAND[50],   // selected tint, icon wells

  // ── Backgrounds ─────────────────────────────────────────────
  bg:       '#FAF8FD',   // body background (web body)
  card:     '#FFFFFF',
  cardSoft: '#F9FAFB',   // gray-50 — nested panels, notes
  muted:    '#F3F4F6',   // gray-100 — segmented controls

  // ── Typography (web gray scale) ─────────────────────────────
  text:      '#111827',  // gray-900
  textBody:  '#4B5563',  // gray-600
  textMuted: '#6B7280',  // gray-500
  textFaint: '#9CA3AF',  // gray-400
  white:     '#FFFFFF',

  // ── Borders ─────────────────────────────────────────────────
  border:      '#E5E7EB',  // gray-200
  borderLight: '#F3F4F6',  // gray-100

  // ── Status ──────────────────────────────────────────────────
  success:      '#059669',
  successLight: '#ECFDF5',
  danger:       '#DC2626',
  dangerLight:  '#FEF2F2',
  warning:      '#B45309',
  warningLight: '#FFFBEB',
  info:         '#0369A1',
  infoLight:    '#F0F9FF',
  star:         '#FBBF24',
};

export const GRADIENT = {
  primary: [BRAND[700], BRAND[900]],  // hero cards (web: from-brand-700 to-brand-900)
  soft:    [BRAND[500], BRAND[700]],
  light:   [BRAND[50], '#FFFFFF'],
};

export const SHADOWS = {
  // Web "shadow-card": soft and barely purple
  sm:   { shadowColor: BRAND[900], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,  elevation: 1 },
  card: { shadowColor: BRAND[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  md:   { shadowColor: BRAND[900], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  lg:   { shadowColor: BRAND[900], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 8 },
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 12,   // inputs, buttons (web rounded-xl)
  lg: 16,   // cards (web rounded-2xl)
  xl: 24,   // hero cards (web rounded-3xl)
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPE = {
  h1:      { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  h2:      { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  h3:      { fontSize: 18, fontWeight: '700', color: COLORS.text },
  h4:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  body:    { fontSize: 14, fontWeight: '400', color: COLORS.textBody, lineHeight: 20 },
  bodyMd:  { fontSize: 15, fontWeight: '400', color: COLORS.textBody, lineHeight: 22 },
  label:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  caption: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  micro:   { fontSize: 11, fontWeight: '500', color: COLORS.textFaint },
};
