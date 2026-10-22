import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import usePolling from '../lib/usePolling';
import { fmtDate, fmtDay } from '../lib/format';
import { COLORS as C, RADIUS, TYPE } from '../theme';

const POLL_MS = 60 * 1000;

/**
 * Caregiver home, while Tunza checks their documents (web: VerificationBanner in
 * pages/caregiver/Dashboard.jsx). They can use the app and set up their profile, but
 * families can't see or book them yet. Re-checks every minute so it disappears by
 * itself once an admin approves.
 */
export default function VerificationBanner({ onPressProfile }) {
  const { user, refreshUser } = useAuth();
  const setup = user?.caregiver_setup;
  const waiting = user?.role === 'caregiver' && setup && !setup.verified;
  usePolling(useCallback(() => (waiting ? refreshUser().catch(() => {}) : null), [waiting, refreshUser]), POLL_MS);
  if (!waiting) return null;

  const expected = setup.verification_expected_by ? new Date(setup.verification_expected_by) : null;
  const overdue = expected && expected < new Date();
  const steps = [
    { state: 'done', title: 'Documents received', sub: setup.verification_submitted_at ? fmtDate(setup.verification_submitted_at) : '' },
    { state: 'active', title: 'Background check', sub: 'ID and Certificate of Good Conduct' },
    { state: 'next', title: 'Families can book you', sub: 'As soon as you are approved' },
  ];

  return (
    <View style={st.card}>
      <View style={st.top}>
        <View style={st.icon}><Feather name="clock" size={18} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={TYPE.h4}>We're checking your documents</Text>
          <Text style={st.eta}>
            {overdue ? 'Taking a little longer than usual. We are on it.'
              : expected ? `Expect an answer by ${fmtDay(expected)}` : 'Expect an answer in 2–3 days'}
          </Text>
        </View>
      </View>

      <View style={st.steps}>
        {steps.map((s, i) => (
          <View key={s.title} style={st.step}>
            <View style={[st.dot, s.state === 'done' && st.dotDone, s.state === 'active' && st.dotActive]}>
              <Feather name={s.state === 'done' ? 'check' : s.state === 'active' ? 'search' : 'briefcase'} size={11}
                color={s.state === 'next' ? C.textFaint : '#fff'} />
            </View>
            <Text style={[st.stepTxt, s.state === 'next' && { color: C.textMuted }]} numberOfLines={2}>{s.title}</Text>
            {i < steps.length - 1 ? <View style={st.line} /> : null}
          </View>
        ))}
      </View>

      <Text style={st.body}>
        Until then you're hidden from families and can't apply for jobs. Look around, and make your profile great so you're ready on day one. We'll text you when you're approved.
      </Text>
      {onPressProfile ? (
        <TouchableOpacity onPress={onPressProfile} style={st.link} hitSlop={8}>
          <Text style={st.linkTxt}>Polish your profile</Text>
          <Feather name="arrow-right" size={15} color={C.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card:     { backgroundColor: C.primaryXLight, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.primaryLight, padding: 16, marginBottom: 14 },
  top:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:     { width: 38, height: 38, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  eta:      { fontSize: 13, fontWeight: '700', color: C.primaryDark, marginTop: 2 },
  steps:    { flexDirection: 'row', marginTop: 16 },
  step:     { flex: 1, alignItems: 'center' },
  dot:      { width: 24, height: 24, borderRadius: 12, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotDone:  { backgroundColor: C.success },
  dotActive:{ backgroundColor: C.primary },
  line:     { position: 'absolute', top: 11, left: '60%', right: '-40%', height: 2, backgroundColor: C.primaryLight },
  stepTxt:  { fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 6, paddingHorizontal: 2 },
  body:     { fontSize: 13, color: C.textBody, lineHeight: 19, marginTop: 14 },
  link:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  linkTxt:  { fontSize: 14, fontWeight: '800', color: C.primary },
});
