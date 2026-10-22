import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Notice } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import usePolling from '../../../lib/usePolling';
import { errorMessage, fmtDate, fmtDay } from '../../../lib/format';
import { COLORS as C, RADIUS, TYPE } from '../../../theme';
import SetupFooter from './SetupFooter';

const POLL_MS = 60 * 1000;

/**
 * Caregiver onboarding, after the documents are in: wait for Tunza's background
 * check (2–3 days). Checks every minute while the screen is open; when an admin
 * approves, /auth/me/ moves `caregiver_setup.next` to "profile" and the navigator
 * opens profile setup. If rejected, it goes back to the documents screen.
 */
export default function SetupWaitingScreen() {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const setup = user?.caregiver_setup || {};
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  const expected = setup.verification_expected_by ? new Date(setup.verification_expected_by) : null;
  const overdue = expected && expected < new Date();

  // Quiet background check — the navigator moves on by itself when the status changes.
  usePolling(useCallback(() => refreshUser().catch(() => {}), [refreshUser]), POLL_MS);

  const check = async () => {
    setChecking(true);
    setMessage({ kind: '', text: '' });
    try {
      const me = await refreshUser();
      if (me?.caregiver_setup?.next === 'verification') {
        setMessage({ kind: 'info', text: "Still under review. We'll text you and send a notification as soon as it's done." });
      }
    } catch (e) {
      setMessage({ kind: 'error', text: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  };

  const steps = [
    { icon: 'check', state: 'done', title: 'Documents received',
      sub: setup.verification_submitted_at ? `Submitted ${fmtDate(setup.verification_submitted_at)}` : 'Submitted' },
    { icon: 'search', state: 'active', title: 'Background check',
      sub: 'We confirm your ID and Certificate of Good Conduct, and check any certificates you added.' },
    { icon: 'user', state: 'next', title: 'Set up your profile', sub: 'Your bio, rate, the care you offer, areas and hours.' },
    { icon: 'briefcase', state: 'next', title: 'Start getting jobs', sub: 'Families near you can find and book you.' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 32, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={checking} onRefresh={check} tintColor={C.primary} />}>
      <View style={st.hero}><Feather name="clock" size={32} color="#fff" /></View>
      <Text style={[TYPE.h1, { textAlign: 'center', marginTop: 20 }]}>We're checking your documents</Text>
      <Text style={[TYPE.bodyMd, { textAlign: 'center', marginTop: 10 }]}>
        Thank you for applying{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}. Background checks take 2 to 3 days.
      </Text>

      <View style={st.eta}>
        <Feather name="calendar" size={16} color={C.primaryDark} />
        <Text style={st.etaTxt}>
          {overdue
            ? 'Taking a little longer than usual. We are on it.'
            : expected ? `Expect an answer by ${fmtDay(expected)}` : 'Expect an answer within 3 days'}
        </Text>
      </View>

      <Card style={{ marginTop: 20 }}>
        {steps.map((s, i) => (
          <View key={s.title} style={[st.row, i > 0 && { marginTop: 18 }]}>
            <View style={{ alignItems: 'center' }}>
              <View style={[st.dot, s.state === 'done' && st.dotDone, s.state === 'active' && st.dotActive]}>
                <Feather name={s.icon} size={14} color={s.state === 'next' ? C.textFaint : '#fff'} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.h4, s.state === 'next' && { color: C.textMuted }]}>{s.title}</Text>
              <Text style={TYPE.caption}>{s.sub}</Text>
            </View>
            {s.state === 'active' ? <Text style={st.now}>IN PROGRESS</Text> : null}
          </View>
        ))}
      </Card>

      <Notice kind="info" style={{ marginTop: 14 }}>
        You don't need to keep the app open. We'll send you an SMS and a notification when you're approved. Meanwhile, think about a short bio and your hourly rate. You'll add them next.
      </Notice>
      {message.text ? <Notice kind={message.kind} style={{ marginTop: 12 }}>{message.text}</Notice> : null}

      <Button title="Check status" iconName="refresh-cw" variant="secondary" onPress={check}
        loading={checking} disabled={checking} style={{ marginTop: 20 }} />
      <SetupFooter />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  hero:      { alignSelf: 'center', width: 72, height: 72, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  eta:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center', marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.primaryXLight },
  etaTxt:    { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot:       { width: 30, height: 30, borderRadius: 15, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  dotDone:   { backgroundColor: C.success },
  dotActive: { backgroundColor: C.primary },
  now:       { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: C.primary, marginTop: 4 },
});
