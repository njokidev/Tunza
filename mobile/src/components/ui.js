import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPE, GRADIENT, BRAND } from '../theme';
import { initials as getInitials, kes } from '../lib/format';

// ── Re-export COLORS so screens can still import from ui.js ──────────────────
export { COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// ICON — Feather set, the closest match to the web app's lucide icons
// ─────────────────────────────────────────────────────────────────────────────
export const Icon = ({ name, size = 18, color = COLORS.text, style }) => (
  <Feather name={name} size={size} color={color} style={style} />
);

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// variants: primary | secondary | outline | ghost | danger | danger-soft | success
// sizes:    sm | md | lg
// `icon` is an emoji/text glyph (legacy); `iconName` is a Feather icon name.
// ─────────────────────────────────────────────────────────────────────────────
const BTN = {
  primary:       { bg: COLORS.primary,      fg: '#fff',          border: COLORS.primary },
  secondary:     { bg: COLORS.primaryXLight, fg: COLORS.primary, border: COLORS.primaryXLight },
  outline:       { bg: '#fff',              fg: COLORS.text,     border: COLORS.border },
  ghost:         { bg: 'transparent',       fg: COLORS.textBody, border: 'transparent' },
  danger:        { bg: COLORS.danger,       fg: '#fff',          border: COLORS.danger },
  'danger-soft': { bg: COLORS.dangerLight,  fg: '#B91C1C',       border: COLORS.dangerLight },
  success:       { bg: COLORS.success,      fg: '#fff',          border: COLORS.success },
};
const BTN_SIZE = {
  sm: { py: 8,  px: 12, fs: 13, ic: 15 },
  md: { py: 13, px: 18, fs: 15, ic: 17 },
  lg: { py: 16, px: 22, fs: 16, ic: 19 },
};

export const Button = ({
  title, onPress, loading, variant = 'primary', size = 'md', style, textStyle, disabled, icon, iconName, children,
}) => {
  const v = BTN[variant] || BTN.primary;
  const z = BTN_SIZE[size] || BTN_SIZE.md;
  const off = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress} disabled={off} activeOpacity={0.85}
      style={[
        s.btn,
        { backgroundColor: v.bg, borderColor: v.border, paddingVertical: z.py, paddingHorizontal: z.px },
        variant === 'primary' && SHADOWS.sm,
        off && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {iconName ? <Feather name={iconName} size={z.ic} color={v.fg} /> : null}
          {icon ? <Text style={{ fontSize: z.ic }}>{icon}</Text> : null}
          {title ? <Text style={[s.btnTxt, { color: v.fg, fontSize: z.fs }, textStyle]}>{title}</Text> : null}
          {children}
        </>
      )}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, hint, icon, iconName, style, containerStyle, ...props }) => (
  <View style={[{ marginBottom: 16 }, containerStyle]}>
    {label ? <Text style={s.inputLabel}>{label}</Text> : null}
    <View style={[s.inputWrap, error && s.inputError, props.editable === false && s.inputDisabled]}>
      {iconName ? <Feather name={iconName} size={17} color={COLORS.textFaint} style={{ marginRight: 8 }} /> : null}
      {icon ? <Text style={s.inputIcon}>{icon}</Text> : null}
      <TextInput
        style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, style]}
        placeholderTextColor={COLORS.textFaint}
        {...props}
      />
    </View>
    {error ? <Text style={s.inputErrorTxt}>{error}</Text> : null}
    {hint && !error ? <Text style={s.inputHint}>{hint}</Text> : null}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD — the standard white container (web: rounded-2xl border shadow-card)
// ─────────────────────────────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, noPad }) => {
  const inner = <View style={[s.card, noPad && { padding: 0 }, style]}>{children}</View>;
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.9}>{inner}</TouchableOpacity>
    : inner;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN HEADER — light page header with optional back button and action
// (web: PageHeader). Handles the status-bar inset itself.
// ─────────────────────────────────────────────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, onBack, right, eyebrow, style }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screenHeader, { paddingTop: insets.top + 12 }, style]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={10} accessibilityLabel="Back">
          <Feather name="arrow-left" size={18} color={COLORS.textBody} />
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
          <Text style={TYPE.h1}>{title}</Text>
          {subtitle ? <Text style={[TYPE.body, { color: COLORS.textMuted, marginTop: 4 }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT HEADER — kept for older screens
// ─────────────────────────────────────────────────────────────────────────────
export const GradientHeader = ({ children, style }) => (
  <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.gradHeader, style]}>
    {children}
  </LinearGradient>
);

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  pending:   { bg: '#FFFBEB', text: '#B45309' },
  accepted:  { bg: '#F0F9FF', text: '#0369A1' },
  rejected:  { bg: '#FEF2F2', text: '#B91C1C' },
  ongoing:   { bg: BRAND[50], text: BRAND[700] },
  completed: { bg: '#ECFDF5', text: '#047857' },
  cancelled: { bg: '#F3F4F6', text: '#4B5563' },
  available: { bg: '#ECFDF5', text: '#047857' },
  busy:      { bg: '#F3F4F6', text: '#6B7280' },
  verified:  { bg: '#ECFDF5', text: '#047857' },
  caregiver: { bg: BRAND[50], text: BRAND[700] },
  patient:   { bg: '#F0F9FF', text: '#0369A1' },
  admin:     { bg: '#FEF2F2', text: '#B91C1C' },
};

export const Badge = ({ label }) => {
  const key = (label || '').toLowerCase().replace(' ', '_');
  const c = BADGE_MAP[key] || { bg: '#F3F4F6', text: '#374151' };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeTxt, { color: c.text }]}>{label}</Text>
    </View>
  );
};

/** Status pill driven by a map from lib/constants (BOOKING_STATUS, REQUEST_STATUS…). */
export const StatusPill = ({ map, status }) => {
  const c = map?.[status] ?? { label: status, bg: '#F3F4F6', fg: '#374151' };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeTxt, { color: c.fg, textTransform: 'none' }]}>{c.label}</Text>
    </View>
  );
};

export const VerifiedBadge = ({ verified, compact }) => {
  if (!verified) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Feather name="check-circle" size={14} color={COLORS.success} />
      {!compact ? <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.success }}>Verified</Text> : null}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR — photo, or initials on the brand gradient (web Avatar)
// ─────────────────────────────────────────────────────────────────────────────
export const Avatar = ({ uri, name = '?', size = 48, ring = false }) => {
  const body = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.muted }} />
  ) : (
    <LinearGradient
      colors={[BRAND[500], BRAND[800]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>{getInitials(name)}</Text>
    </LinearGradient>
  );
  if (!ring) return body;
  return <View style={{ padding: 3, borderRadius: size / 2 + 3, backgroundColor: '#fff', ...SHADOWS.sm }}>{body}</View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// RATING
// ─────────────────────────────────────────────────────────────────────────────
export const Stars = ({ score, size = 14 }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Text key={i} style={{ fontSize: size, color: i <= score ? COLORS.star : COLORS.border }}>★</Text>
    ))}
  </View>
);

/** Web <Rating>: ★ 4.5 (12) — or "New on Tunza" when there are no reviews. */
export const Rating = ({ value, count, size = 13 }) => {
  if (!count) return <Text style={{ fontSize: size - 1, fontWeight: '600', color: COLORS.textMuted }}>New on Tunza</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: size + 1, color: COLORS.star }}>★</Text>
      <Text style={{ fontSize: size, fontWeight: '700', color: COLORS.text }}>{Number(value || 0).toFixed(1)}</Text>
      <Text style={{ fontSize: size, color: COLORS.textMuted }}>({count})</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export const Divider = ({ style }) => <View style={[s.divider, style]} />;

export const SectionLabel = ({ label, action, onAction, style }) => (
  <View style={[s.sectionRow, style]}>
    <Text style={s.sectionLabel}>{label}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction} hitSlop={8}><Text style={s.sectionAction}>{action}</Text></TouchableOpacity>
    ) : null}
  </View>
);

const TONES = {
  brand: { bg: COLORS.primaryXLight, fg: COLORS.primary },
  green: { bg: COLORS.successLight, fg: COLORS.success },
  amber: { bg: COLORS.warningLight, fg: COLORS.warning },
  sky:   { bg: COLORS.infoLight, fg: COLORS.info },
};

/** Icon in a soft tinted square (web: rounded-xl bg-brand-50 p-2.5). */
export const IconWell = ({ name, tone = 'brand', size = 18, style }) => {
  const t = TONES[tone] || TONES.brand;
  return (
    <View style={[s.iconWell, { backgroundColor: t.bg }, style]}>
      <Feather name={name} size={size} color={t.fg} />
    </View>
  );
};

/** Metric tile. Pass `iconName` + `tone` for the web look; `icon` (emoji) still works. */
export const StatCard = ({ icon, iconName, tone = 'brand', value, label, sub, style, onPress }) => {
  const body = (
    <View style={[s.card, s.statCard]}>
      {iconName ? <IconWell name={iconName} tone={tone} size={16} /> : <Text style={{ fontSize: 22 }}>{icon}</Text>}
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={s.statSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ flex: 1 }, style]}>{body}</TouchableOpacity>
    : <View style={[{ flex: 1 }, style]}>{body}</View>;
};

export const LoadingScreen = ({ message = 'Loading…' }) => (
  <View style={[s.center, { backgroundColor: COLORS.bg }]}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={[TYPE.caption, { marginTop: 12 }]}>{message}</Text>
  </View>
);

/** Empty state (web EmptyState). `iconName` is Feather; `icon` emoji kept for old screens. */
export const Empty = ({ icon, iconName, title, subtitle, action, onAction, style }) => (
  <View style={[s.empty, style]}>
    {iconName ? <IconWell name={iconName} size={26} style={{ padding: 14, borderRadius: 18 }} />
      : icon ? <Text style={{ fontSize: 44 }}>{icon}</Text> : null}
    <Text style={[TYPE.h4, { marginTop: 14, textAlign: 'center' }]}>{title}</Text>
    {subtitle ? <Text style={[TYPE.body, { color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
    {action ? <Button title={action} onPress={onAction} style={{ marginTop: 18, alignSelf: 'center' }} size="sm" /> : null}
  </View>
);

/** Inline alert (web Alert). kind: error | success | info */
export const Notice = ({ kind = 'error', children, style }) => {
  if (!children) return null;
  const c = kind === 'error' ? { bg: COLORS.dangerLight, fg: '#991B1B', b: '#FECACA', i: 'alert-circle' }
    : kind === 'success' ? { bg: COLORS.successLight, fg: '#065F46', b: '#A7F3D0', i: 'check-circle' }
      : { bg: COLORS.primaryXLight, fg: COLORS.primaryDark, b: BRAND[200], i: 'info' };
  return (
    <View style={[s.notice, { backgroundColor: c.bg, borderColor: c.b }, style]}>
      <Feather name={c.i} size={16} color={c.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: c.fg, fontSize: 13, lineHeight: 19 }}>{children}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHIPS & SEGMENTED TABS
// ─────────────────────────────────────────────────────────────────────────────
export const Chip = ({ label, active, onPress, iconName, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.chip, active && s.chipActive, style]}>
    {active ? <Feather name="check" size={13} color="#fff" /> : iconName ? <Feather name={iconName} size={13} color={COLORS.textBody} /> : null}
    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
  </TouchableOpacity>
);

/** Segmented control (web Tabs). tabs: [{value,label,count}] */
export const Segmented = ({ tabs, value, onChange, style }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={[s.segment, style]}>
    {tabs.map((t) => {
      const on = value === t.value;
      return (
        <TouchableOpacity key={t.value} onPress={() => onChange(t.value)} activeOpacity={0.85} style={[s.segBtn, on && s.segBtnOn]}>
          <Text style={[s.segTxt, on && { color: COLORS.primary }]}>{t.label}</Text>
          {t.count > 0 ? (
            <View style={[s.segCount, on && { backgroundColor: COLORS.primaryLight }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: on ? COLORS.primary : COLORS.textBody }}>{t.count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ─────────────────────────────────────────────────────────────────────────────
// CAREGIVER CARD — list card (web components/CaregiverCard)
// ─────────────────────────────────────────────────────────────────────────────
export const CaregiverCard = ({ item, onPress, onBook, match, rank, footer }) => {
  const cg = item;
  const specs = cg.specializations ?? [];
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View>
          <Avatar uri={cg.user?.avatar} name={cg.user?.full_name} size={58} />
          {rank ? <View style={s.rank}><Text style={s.rankTxt}>{rank}</Text></View> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[TYPE.h4, { flexShrink: 1 }]} numberOfLines={1}>{cg.user?.full_name}</Text>
            <VerifiedBadge verified={cg.user?.is_verified} compact />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 3 }}>
            {cg.location_name ? (
              <View style={s.meta}><Feather name="map-pin" size={12} color={COLORS.textMuted} /><Text style={TYPE.caption}>{cg.location_name}</Text></View>
            ) : null}
            <View style={s.meta}><Feather name="clock" size={12} color={COLORS.textMuted} /><Text style={TYPE.caption}>{cg.years_exp ?? 0} yrs exp</Text></View>
          </View>
          <View style={{ marginTop: 5 }}><Rating value={cg.rating_avg} count={cg.rating_count} /></View>
        </View>
        {match ? <MatchScore score={match.match_score} /> : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.rate}>{kes(cg.hourly_rate)}</Text>
            <Text style={TYPE.caption}>per hour</Text>
          </View>
        )}
      </View>

      {specs.length > 0 ? (
        <View style={s.specRow}>
          {specs.slice(0, 4).map((sp) => (
            <View key={sp.id} style={s.specChip}><Text style={s.specTxt}>{sp.name}</Text></View>
          ))}
        </View>
      ) : null}

      {match?.match_reasons?.length ? (
        <View style={s.reasons}>
          {match.match_reasons.slice(0, 4).map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Feather name="check-circle" size={14} color={COLORS.success} style={{ marginTop: 2 }} />
              <Text style={[TYPE.body, { flex: 1, color: COLORS.text }]}>{r}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(onBook || footer || match) ? (
        <View style={s.cardFooter}>
          {match ? (
            <Text style={[TYPE.h4, { flex: 1 }]}>{kes(cg.hourly_rate)}<Text style={TYPE.caption}>/hr</Text></Text>
          ) : <View style={{ flex: 1 }} />}
          {footer}
          {onBook ? <Button title="Book" size="sm" iconName="calendar" onPress={onBook} /> : null}
        </View>
      ) : null}
    </Card>
  );
};

/** Match score badge (web MatchRing, simplified for RN without SVG). */
export const MatchScore = ({ score }) => {
  const pct = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  const tone = pct >= 70 ? COLORS.success : pct >= 45 ? COLORS.primary : COLORS.warning;
  return (
    <View style={[s.matchRing, { borderColor: tone }]}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.text }}>{pct}%</Text>
      <Text style={{ fontSize: 8, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 }}>MATCH</Text>
    </View>
  );
};

/** Compact grid tile for the patient home "Caregivers near you" section. */
export const CaregiverTile = ({ item, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s.tile, style]}>
    <Avatar uri={item.user?.avatar} name={item.user?.full_name} size={64} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, maxWidth: '100%' }}>
      <Text style={[TYPE.h4, { textAlign: 'center', flexShrink: 1 }]} numberOfLines={1}>{item.user?.full_name}</Text>
      <VerifiedBadge verified={item.user?.is_verified} compact />
    </View>
    <Text style={[TYPE.caption, { marginTop: 2, textAlign: 'center' }]} numberOfLines={1}>
      {item.specializations?.[0]?.name || 'Home caregiver'}
    </Text>
    <View style={{ marginTop: 6 }}><Rating value={item.rating_avg} count={item.rating_count} size={12} /></View>
    <Text style={[s.tileRate]}>{kes(item.hourly_rate)}<Text style={TYPE.micro}>/hr</Text></Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  btn:     { borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnTxt:  { fontWeight: '700' },

  inputLabel:    { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 7 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.card, paddingHorizontal: 14 },
  inputError:    { borderColor: COLORS.danger },
  inputDisabled: { backgroundColor: COLORS.cardSoft },
  input:         { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 12 },
  inputIcon:     { marginRight: 8, fontSize: 16 },
  inputErrorTxt: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontWeight: '600' },
  inputHint:     { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.card },

  screenHeader: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.bg },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, alignSelf: 'flex-start' },
  backTxt:      { fontSize: 14, fontWeight: '600', color: COLORS.textBody },
  eyebrow:      { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  gradHeader:   { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },

  badge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },

  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel:  { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionAction: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  iconWell:  { padding: 9, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
  statCard:  { flex: 1, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 10, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
  statSub:   { fontSize: 11, color: COLORS.textFaint, marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  empty:  { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, borderRadius: RADIUS.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.6)' },
  notice: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, padding: 12 },

  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:       { fontSize: 13, fontWeight: '600', color: COLORS.textBody },
  chipTxtActive: { color: '#fff' },

  segment:  { backgroundColor: COLORS.muted, borderRadius: RADIUS.md, padding: 4, gap: 4 },
  segBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  segBtnOn: { backgroundColor: '#fff', ...SHADOWS.sm },
  segTxt:   { fontSize: 13, fontWeight: '700', color: COLORS.textBody },
  segCount: { backgroundColor: COLORS.border, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 },

  meta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rate:       { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  specRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  specChip:   { backgroundColor: COLORS.primaryXLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  specTxt:    { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  reasons:    { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  rank:       { position: 'absolute', left: -4, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.text, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  rankTxt:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  matchRing:  { width: 60, height: 60, borderRadius: 30, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  tile:     { flex: 1, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: 18, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.card },
  tileRate: { marginTop: 8, fontSize: 13, fontWeight: '800', color: COLORS.primary },
});
