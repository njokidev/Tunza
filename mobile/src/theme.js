// // ─── Tunza Design System ──────────────────────────────────────────────────────
// // Purple-led healthcare palette. Every color, shadow, radius and spacing value
// // in the app comes from here — never hardcoded in screens.

// export const COLORS = {
//   // ── Primary purple ──────────────────────────────────────────
//   primary:      '#7C3AED',   // Violet 600 — buttons, active tabs, accents
//   primaryDark:  '#5B21B6',   // Violet 800 — gradient end, pressed states
//   primaryMid:   '#8B5CF6',   // Violet 500 — hover, soft CTAs
//   primaryLight: '#EDE9FE',   // Violet 100 — chip backgrounds, tag fills
//   primaryXLight:'#F5F3FF',   // Violet 50  — selected row tint

//   // ── App backgrounds ─────────────────────────────────────────
//   bg:           '#F8F7FF',   // Barely-purple white — body background
//   card:         '#FFFFFF',   // Pure white cards
//   cardSoft:     '#FDFCFF',   // Very slight tint for nested cards

//   // ── Typography ──────────────────────────────────────────────
//   text:         '#1E1B4B',   // Indigo 950 — body copy (purple-tinted black)
//   textMuted:    '#64748B',   // Slate 500 — secondary labels
//   textFaint:    '#94A3B8',   // Slate 400 — placeholders, hints
//   white:        '#FFFFFF',

//   // ── Borders ─────────────────────────────────────────────────
//   border:       '#E8E5F5',   // Purple-tinted border
//   borderLight:  '#F1EFF9',   // Lighter dividers

//   // ── Status colours ──────────────────────────────────────────
//   success:      '#059669',
//   successLight: '#D1FAE5',
//   danger:       '#DC2626',
//   dangerLight:  '#FEE2E2',
//   warning:      '#D97706',
//   warningLight: '#FEF3C7',
//   info:         '#0EA5E9',
//   infoLight:    '#E0F2FE',
// };

// export const GRADIENT = {
//   primary:  ['#7C3AED', '#5B21B6'],   // main header gradient
//   soft:     ['#8B5CF6', '#7C3AED'],   // subtle card gradient
//   light:    ['#EDE9FE', '#F5F3FF'],   // background accent
// };

// export const SHADOWS = {
//   // Purple-tinted shadows — distinctive, not generic grey
//   sm:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.08, shadowRadius:6,  elevation:2 },
//   md:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:4},  shadowOpacity:0.12, shadowRadius:12, elevation:4 },
//   lg:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:8},  shadowOpacity:0.16, shadowRadius:20, elevation:8 },
//   card: { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.07, shadowRadius:8,  elevation:3 },
// };

// export const RADIUS = {
//   xs:  6,
//   sm:  10,
//   md:  14,
//   lg:  20,
//   xl:  28,
//   pill:99,
// };

// export const SPACING = {
//   xs:  4,
//   sm:  8,
//   md:  16,
//   lg:  24,
//   xl:  32,
//   xxl: 48,
// };

// export const TYPE = {
//   h1:      { fontSize:28, fontWeight:'800', color:COLORS.text, letterSpacing:-0.5 },
//   h2:      { fontSize:22, fontWeight:'700', color:COLORS.text },
//   h3:      { fontSize:18, fontWeight:'700', color:COLORS.text },
//   h4:      { fontSize:15, fontWeight:'600', color:COLORS.text },
//   body:    { fontSize:14, fontWeight:'400', color:COLORS.text,     lineHeight:20 },
//   bodyMd:  { fontSize:15, fontWeight:'400', color:COLORS.text,     lineHeight:22 },
//   label:   { fontSize:13, fontWeight:'600', color:COLORS.textMuted },
//   caption: { fontSize:12, fontWeight:'400', color:COLORS.textMuted },
//   micro:   { fontSize:11, fontWeight:'500', color:COLORS.textFaint },
// };


// export const COLORS = {
//   primary:      '#7C3AED',
//   primaryDark:  '#5B21B6',
//   primaryMid:   '#8B5CF6',
//   primaryLight: '#EDE9FE',
//   primaryXLight:'#F5F3FF',
//   bg:           '#F8F7FF',
//   card:         '#FFFFFF',
//   cardSoft:     '#FDFCFF',
//   text:         '#1E1B4B',
//   textMuted:    '#64748B',
//   textFaint:    '#94A3B8',
//   white:        '#FFFFFF',
//   border:       '#E8E5F5',
//   borderLight:  '#F1EFF9',
//   success:      '#059669',
//   successLight: '#D1FAE5',
//   danger:       '#DC2626',
//   dangerLight:  '#FEE2E2',
//   warning:      '#D97706',
//   warningLight: '#FEF3C7',
//   info:         '#0EA5E9',
//   infoLight:    '#E0F2FE',
// };

// export const GRADIENT = {
//   primary: ['#7C3AED', '#5B21B6'],
//   soft:    ['#8B5CF6', '#7C3AED'],
//   light:   ['#EDE9FE', '#F5F3FF'],
// };

// export const SHADOWS = {
//   sm:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.08, shadowRadius:6,  elevation:2 },
//   md:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:4},  shadowOpacity:0.12, shadowRadius:12, elevation:4 },
//   lg:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:8},  shadowOpacity:0.16, shadowRadius:20, elevation:8 },
//   card: { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.07, shadowRadius:8,  elevation:3 },
// };

// export const RADIUS = {
//   xs:  6,
//   sm:  10,
//   md:  14,
//   lg:  20,
//   xl:  28,
//   pill:99,
// };

// export const SPACING = {
//   xs:  4,
//   sm:  8,
//   md:  16,
//   lg:  24,
//   xl:  32,
//   xxl: 48,
// };

// export const TYPE = {
//   h1:      { fontSize:28, fontWeight:'800', color:'#1E1B4B', letterSpacing:-0.5 },
//   h2:      { fontSize:22, fontWeight:'700', color:'#1E1B4B' },
//   h3:      { fontSize:18, fontWeight:'700', color:'#1E1B4B' },
//   h4:      { fontSize:15, fontWeight:'600', color:'#1E1B4B' },
//   body:    { fontSize:14, fontWeight:'400', color:'#1E1B4B', lineHeight:20 },
//   bodyMd:  { fontSize:15, fontWeight:'400', color:'#1E1B4B', lineHeight:22 },
//   label:   { fontSize:13, fontWeight:'600', color:'#64748B' },
//   caption: { fontSize:12, fontWeight:'400', color:'#64748B' },
//   micro:   { fontSize:11, fontWeight:'500', color:'#94A3B8' },
// };


// ─── Tunza Design System ──────────────────────────────────────────────────────
// Purple-led healthcare palette. Every color, shadow, radius and spacing value
// in the app comes from here — never hardcoded in screens.

export const COLORS = {
  // ── Primary purple ──────────────────────────────────────────
  primary:      '#7C3AED',   // Violet 600 — buttons, active tabs, accents
  primaryDark:  '#5B21B6',   // Violet 800 — gradient end, pressed states
  primaryMid:   '#8B5CF6',   // Violet 500 — hover, soft CTAs
  primaryLight: '#EDE9FE',   // Violet 100 — chip backgrounds, tag fills
  primaryXLight:'#F5F3FF',   // Violet 50  — selected row tint

  // ── App backgrounds ─────────────────────────────────────────
  bg:           '#F8F7FF',   // Barely-purple white — body background
  card:         '#FFFFFF',   // Pure white cards
  cardSoft:     '#FDFCFF',   // Very slight tint for nested cards

  // ── Typography ──────────────────────────────────────────────
  text:         '#1E1B4B',   // Indigo 950 — body copy (purple-tinted black)
  textMuted:    '#64748B',   // Slate 500 — secondary labels
  textFaint:    '#94A3B8',   // Slate 400 — placeholders, hints
  white:        '#FFFFFF',

  // ── Borders ─────────────────────────────────────────────────
  border:       '#E8E5F5',   // Purple-tinted border
  borderLight:  '#F1EFF9',   // Lighter dividers

  // ── Status colours ──────────────────────────────────────────
  success:      '#059669',
  successLight: '#D1FAE5',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  info:         '#0EA5E9',
  infoLight:    '#E0F2FE',
};

export const GRADIENT = {
  primary:  ['#7C3AED', '#5B21B6'],   // main header gradient
  soft:     ['#8B5CF6', '#7C3AED'],   // subtle card gradient
  light:    ['#EDE9FE', '#F5F3FF'],   // background accent
};

export const SHADOWS = {
  // Purple-tinted shadows — distinctive, not generic grey
  sm:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.08, shadowRadius:6,  elevation:2 },
  md:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:4},  shadowOpacity:0.12, shadowRadius:12, elevation:4 },
  lg:   { shadowColor:'#7C3AED', shadowOffset:{width:0,height:8},  shadowOpacity:0.16, shadowRadius:20, elevation:8 },
  card: { shadowColor:'#7C3AED', shadowOffset:{width:0,height:2},  shadowOpacity:0.07, shadowRadius:8,  elevation:3 },
};

export const RADIUS = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  20,
  xl:  28,
  pill:99,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const TYPE = {
  h1:      { fontSize:28, fontWeight:'800', color:COLORS.text, letterSpacing:-0.5 },
  h2:      { fontSize:22, fontWeight:'700', color:COLORS.text },
  h3:      { fontSize:18, fontWeight:'700', color:COLORS.text },
  h4:      { fontSize:15, fontWeight:'600', color:COLORS.text },
  body:    { fontSize:14, fontWeight:'400', color:COLORS.text,     lineHeight:20 },
  bodyMd:  { fontSize:15, fontWeight:'400', color:COLORS.text,     lineHeight:22 },
  label:   { fontSize:13, fontWeight:'600', color:COLORS.textMuted },
  caption: { fontSize:12, fontWeight:'400', color:COLORS.textMuted },
  micro:   { fontSize:11, fontWeight:'500', color:COLORS.textFaint },
};
