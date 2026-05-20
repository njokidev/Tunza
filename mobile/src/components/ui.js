import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Image,
} from 'react-native';

// ── Colours ───────────────────────────────────────────────────────────────────
export const COLORS = {
  primary:   '#1A56DB',
  secondary: '#7C3AED',
  success:   '#059669',
  danger:    '#DC2626',
  warning:   '#D97706',
  bg:        '#F9FAFB',
  card:      '#FFFFFF',
  border:    '#E5E7EB',
  text:      '#111827',
  muted:     '#6B7280',
  white:     '#FFFFFF',
};

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({ title, onPress, loading, variant = 'primary', style, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading || disabled}
    style={[
      styles.btn,
      variant === 'outline' && styles.btnOutline,
      variant === 'danger'  && { backgroundColor: COLORS.danger },
      (loading || disabled) && { opacity: 0.6 },
      style,
    ]}
  >
    {loading
      ? <ActivityIndicator color={variant === 'outline' ? COLORS.primary : '#fff'} />
      : <Text style={[styles.btnText, variant === 'outline' && { color: COLORS.primary }]}>{title}</Text>
    }
  </TouchableOpacity>
);

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && { borderColor: COLORS.danger }]}
      placeholderTextColor={COLORS.muted}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
const badgeColors = {
  pending:   { bg: '#FEF3C7', text: '#92400E' },
  accepted:  { bg: '#D1FAE5', text: '#065F46' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B' },
  ongoing:   { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#F3F4F6', text: '#374151' },
  cancelled: { bg: '#F3F4F6', text: '#374151' },
  success:   { bg: '#D1FAE5', text: '#065F46' },
  failed:    { bg: '#FEE2E2', text: '#991B1B' },
};

export const Badge = ({ label }) => {
  const c = badgeColors[label?.toLowerCase()] || { bg: '#E5E7EB', text: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
};

// ── Avatar ────────────────────────────────────────────────────────────────────
export const Avatar = ({ uri, name = '?', size = 48 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return uri
    ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
      </View>
    );
};

// ── Stars ─────────────────────────────────────────────────────────────────────
export const Stars = ({ score, size = 16 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Text key={i} style={{ fontSize: size, color: i <= score ? '#F59E0B' : '#D1D5DB' }}>★</Text>
    ))}
  </View>
);

// ── Loading screen ────────────────────────────────────────────────────────────
export const LoadingScreen = ({ message = 'Loading...' }) => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={{ marginTop: 12, color: COLORS.muted }}>{message}</Text>
  </View>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const Empty = ({ icon = '📭', title, subtitle }) => (
  <View style={styles.center}>
    <Text style={{ fontSize: 48 }}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
});
