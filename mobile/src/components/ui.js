import React from 'react';
import { View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPE, GRADIENT } from '../theme';

// ── Re-export COLORS so screens can still import from ui.js ──────────────────
export { COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// variants: primary | outline | ghost | danger
// ─────────────────────────────────────────────────────────────────────────────
export const Button = ({ title, onPress, loading, variant='primary', style, disabled, icon }) => {
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';
  const isDanger  = variant === 'danger';

  if (variant === 'primary' && !isDanger) {
    return (
      <TouchableOpacity
        onPress={onPress} disabled={loading || disabled}
        style={[s.btnWrap, (loading||disabled) && {opacity:0.55}, style]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={loading || disabled ? ['#A78BFA','#8B5CF6'] : GRADIENT.primary}
          start={{x:0,y:0}} end={{x:1,y:0}}
          style={s.btnGradient}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>{icon && <Text style={s.btnIcon}>{icon}</Text>}
              <Text style={s.btnTxt}>{title}</Text></>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress} disabled={loading || disabled} activeOpacity={0.8}
      style={[s.btnBase,
        isOutline && s.btnOutline,
        isGhost   && s.btnGhost,
        isDanger  && s.btnDanger,
        (loading||disabled) && {opacity:0.55},
        style]}
    >
      {loading
        ? <ActivityIndicator color={isDanger ? '#fff' : COLORS.primary} size="small" />
        : <>{icon && <Text style={s.btnIcon}>{icon}</Text>}
          <Text style={[s.btnTxtBase,
            isOutline && {color:COLORS.primary},
            isGhost   && {color:COLORS.primary},
            isDanger  && {color:'#fff'}
          ]}>{title}</Text></>}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, hint, icon, style, containerStyle, ...props }) => (
  <View style={[{marginBottom:16}, containerStyle]}>
    {label && <Text style={s.inputLabel}>{label}</Text>}
    <View style={[s.inputWrap, error && s.inputError, props.editable===false && s.inputDisabled]}>
      {icon && <Text style={s.inputIcon}>{icon}</Text>}
      <TextInput
        style={[s.input, style]}
        placeholderTextColor={COLORS.textFaint}
        {...props}
      />
    </View>
    {error && <Text style={s.inputErrorTxt}>⚠ {error}</Text>}
    {hint  && !error && <Text style={s.inputHint}>{hint}</Text>}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD  — the standard white container
// ─────────────────────────────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, noPad }) => {
  const inner = (
    <View style={[s.card, noPad && {padding:0}, style]}>
      {children}
    </View>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.92}>{inner}</TouchableOpacity>
    : inner;
};

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT HEADER — used on Home, Dashboard, Bookings
// ─────────────────────────────────────────────────────────────────────────────
export const GradientHeader = ({ children, style }) => (
  <LinearGradient
    colors={GRADIENT.primary}
    start={{x:0,y:0}} end={{x:1,y:1}}
    style={[s.gradHeader, style]}
  >
    {children}
  </LinearGradient>
);

// ─────────────────────────────────────────────────────────────────────────────
// BADGE — status chip
// ─────────────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  pending:         { bg:'#FEF3C7', text:'#92400E' },
  accepted:        { bg:'#D1FAE5', text:'#065F46' },
  rejected:        { bg:'#FEE2E2', text:'#991B1B' },
  ongoing:         { bg:'#DBEAFE', text:'#1E40AF' },
  pending_payment: { bg:'#FEF3C7', text:'#92400E' },
  completed:       { bg:'#D1FAE5', text:'#065F46' },
  cancelled:       { bg:'#F3F4F6', text:'#374151' },
  available:       { bg:COLORS.primaryLight, text:COLORS.primaryDark },
  busy:            { bg:'#FEE2E2', text:'#991B1B' },
  verified:        { bg:COLORS.primaryLight, text:COLORS.primaryDark },
  caregiver:       { bg:'#EDE9FE', text:'#5B21B6' },
  patient:         { bg:'#DBEAFE', text:'#1E40AF' },
  admin:           { bg:'#FEE2E2', text:'#991B1B' },
};

export const Badge = ({ label }) => {
  const key = (label||'').toLowerCase().replace(' ','_');
  const c   = BADGE_MAP[key] || {bg:'#F3F4F6', text:'#374151'};
  const display = label === 'pending_payment' ? 'Payment Due' : label;
  return (
    <View style={[s.badge, {backgroundColor:c.bg}]}>
      <Text style={[s.badgeTxt, {color:c.text}]}>{display}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
export const Avatar = ({ uri, name='?', size=48, ring=false }) => {
  const initials = (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const img = uri
    ? <Image source={{uri}} style={{width:size, height:size, borderRadius:size/2}} />
    : <View style={[s.avatarPH, {width:size, height:size, borderRadius:size/2}]}>
        <Text style={{color:'#fff', fontWeight:'700', fontSize:size*0.35}}>{initials}</Text>
      </View>;

  if (!ring) return img;
  return (
    <LinearGradient
      colors={GRADIENT.primary}
      style={{padding:2, borderRadius:(size/2)+2}}
    >
      {uri
        ? <Image source={{uri}} style={{width:size, height:size, borderRadius:size/2}} />
        : <View style={[s.avatarPH, {width:size, height:size, borderRadius:size/2}]}>{img}</View>}
    </LinearGradient>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────────────────────────────
export const Stars = ({ score, size=14 }) => (
  <View style={{flexDirection:'row', gap:1}}>
    {[1,2,3,4,5].map(i => (
      <Text key={i} style={{fontSize:size, color: i<=score ? '#F59E0B' : COLORS.borderLight}}>★</Text>
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
export const Divider = ({style}) => <View style={[s.divider, style]} />;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER — label above a list section
// ─────────────────────────────────────────────────────────────────────────────
export const SectionLabel = ({label, action, onAction}) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionLabel}>{label}</Text>
    {action && <TouchableOpacity onPress={onAction}><Text style={s.sectionAction}>{action}</Text></TouchableOpacity>}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD — small metric card for dashboards
// ─────────────────────────────────────────────────────────────────────────────
export const StatCard = ({icon, value, label, style}) => (
  <Card style={[s.statCard, style]}>
    <Text style={s.statIcon}>{icon}</Text>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const LoadingScreen = ({message='Loading...'}) => (
  <View style={s.center}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={[TYPE.caption, {marginTop:12}]}>{message}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
export const Empty = ({
  icon = '📭',
  title,
  subtitle,
  action,
  onAction,
}) => (
  <View style={s.center}>
    <Text style={{ fontSize: 52 }}>{icon}</Text>

    <Text style={[TYPE.h3, { marginTop: 16, textAlign: 'center' }]}>
      {title}
    </Text>

    {subtitle && (
      <Text
        style={[
          TYPE.body,
          {
            color: COLORS.textMuted,
            textAlign: 'center',
            marginTop: 6,
          },
        ]}
      >
        {subtitle}
      </Text>
    )}

    {action && (
      <Button
        title={action}
        onPress={onAction}
        style={{ marginTop: 20, alignSelf: 'center' }}
      />
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALTY CHIP — horizontal filter pills
// ─────────────────────────────────────────────────────────────────────────────
export const Chip = ({label, active, onPress}) => (
  <TouchableOpacity
    onPress={onPress} activeOpacity={0.8}
    style={[s.chip, active && s.chipActive]}
  >
    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// CAREGIVER CARD — the main list card
// ─────────────────────────────────────────────────────────────────────────────
export const CaregiverCard = ({item, onPress}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{marginBottom:12}}>
    <View style={[s.cgCard, SHADOWS.card]}>
      {/* Purple left accent bar */}
      <View style={s.cgAccent} />
      <View style={s.cgInner}>
        <Avatar uri={item.user?.avatar} name={item.user?.full_name} size={54} />
        <View style={{flex:1, marginLeft:12}}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
            <Text style={TYPE.h4} numberOfLines={1}>{item.user?.full_name}</Text>
            <Badge label={item.is_available ? 'available' : 'busy'} />
          </View>
          <Text style={[TYPE.caption, {marginTop:2}]}>
            📍 {item.location_name || 'Nairobi'}
          </Text>
          <View style={{flexDirection:'row', alignItems:'center', gap:6, marginTop:4}}>
            <Stars score={Math.round(item.rating_avg||0)} />
            <Text style={TYPE.micro}>{item.rating_avg} ({item.rating_count})</Text>
          </View>
          {item.specializations?.length > 0 && (
            <View style={s.specRow}>
              {item.specializations.slice(0,2).map(sp => (
                <View key={sp.id} style={s.specChip}>
                  <Text style={s.specTxt}>{sp.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <Divider style={{marginHorizontal:0, marginTop:12}} />
      <View style={s.cgFooter}>
        <Text style={s.cgRate}>KES {item.hourly_rate}<Text style={TYPE.micro}>/hr</Text></Text>
        <Text style={[TYPE.micro, {color:COLORS.textMuted}]}>{item.experience} · {item.years_exp} yrs</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Button
  btnWrap:     { borderRadius:RADIUS.md, overflow:'hidden' },
  btnGradient: { paddingVertical:15, paddingHorizontal:24, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8 },
  btnBase:     { paddingVertical:14, paddingHorizontal:24, borderRadius:RADIUS.md, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8 },
  btnOutline:  { borderWidth:1.5, borderColor:COLORS.primary, backgroundColor:'transparent' },
  btnGhost:    { backgroundColor:COLORS.primaryLight },
  btnDanger:   { backgroundColor:COLORS.danger },
  btnTxt:      { color:'#fff', fontWeight:'700', fontSize:15 },
  btnTxtBase:  { fontWeight:'700', fontSize:15, color:COLORS.text },
  btnIcon:     { fontSize:16 },

  // Input
  inputLabel:   { fontSize:13, fontWeight:'600', color:COLORS.text, marginBottom:7 },
  inputWrap:    { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:COLORS.border, borderRadius:RADIUS.md, backgroundColor:COLORS.card, paddingHorizontal:14 },
  inputError:   { borderColor:COLORS.danger },
  inputDisabled:{ backgroundColor:COLORS.bg },
  input:        { flex:1, fontSize:14, color:COLORS.text, paddingVertical:13 },
  inputIcon:    { marginRight:8, fontSize:16 },
  inputErrorTxt:{ color:COLORS.danger, fontSize:12, marginTop:4 },
  inputHint:    { color:COLORS.textFaint, fontSize:12, marginTop:4 },

  // Card
  card:  { backgroundColor:COLORS.card, borderRadius:RADIUS.lg, padding:SPACING.md, ...SHADOWS.card },

  // Gradient header
  gradHeader: { paddingTop:56, paddingBottom:24, paddingHorizontal:20 },

  // Badge
  badge:    { paddingHorizontal:10, paddingVertical:3, borderRadius:RADIUS.pill, alignSelf:'flex-start' },
  badgeTxt: { fontSize:11, fontWeight:'600', textTransform:'capitalize' },

  // Avatar
  avatarPH: { backgroundColor:COLORS.primary, alignItems:'center', justifyContent:'center' },

  // Divider
  divider: { height:1, backgroundColor:COLORS.borderLight, marginVertical:SPACING.sm },

  // Section label
  sectionRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:SPACING.sm },
  sectionLabel:  { fontSize:15, fontWeight:'700', color:COLORS.text },
  sectionAction: { fontSize:13, fontWeight:'600', color:COLORS.primary },

  // Stat card
  statCard:  { flex:1, alignItems:'center', paddingVertical:16, borderRadius:RADIUS.lg },
  statIcon:  { fontSize:24, marginBottom:4 },
  statValue: { fontSize:22, fontWeight:'800', color:COLORS.primary },
  statLabel: { fontSize:11, color:COLORS.textMuted, marginTop:2, textAlign:'center' },

  // Chip
  chip:       { paddingHorizontal:16, paddingVertical:8, borderRadius:RADIUS.pill, backgroundColor:COLORS.card, borderWidth:1.5, borderColor:COLORS.border },
  chipActive: { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  chipTxt:    { fontSize:13, fontWeight:'600', color:COLORS.textMuted },
  chipTxtActive:{ color:'#fff' },

  // Caregiver card
  cgCard:    { backgroundColor:COLORS.card, borderRadius:RADIUS.lg, overflow:'hidden', flexDirection:'column' },
  cgAccent:  { width:'100%', height:4, backgroundColor:COLORS.primary },
  cgInner:   { flexDirection:'row', padding:SPACING.md, paddingBottom:SPACING.sm },
  cgFooter:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:SPACING.md, paddingBottom:SPACING.md },
  cgRate:    { fontSize:16, fontWeight:'800', color:COLORS.primary },
  specRow:   { flexDirection:'row', gap:5, marginTop:6, flexWrap:'wrap' },
  specChip:  { backgroundColor:COLORS.primaryLight, paddingHorizontal:8, paddingVertical:2, borderRadius:RADIUS.pill },
  specTxt:   { fontSize:10, color:COLORS.primaryDark, fontWeight:'600' },

  // Shared
  center: { flex:1, alignItems:'center', justifyContent:'center', padding:SPACING.lg },
});
