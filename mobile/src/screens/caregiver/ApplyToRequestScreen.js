import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { careRequestApi } from '../../api';
import { Button, Card, Input, Notice, ScreenHeader } from '../../components/ui';
import { COLORS as C, SHADOWS, TYPE } from '../../theme';
import { DAYS, SCHEDULE_TYPES } from '../../lib/constants';
import { markApplied } from '../../lib/applied';
import { errorMessage, fmtDate, kes, recipientLabel } from '../../lib/format';

/** Apply to an open request (web: caregiver/ApplyModal.jsx). Params: { request, defaultRate? } */
export default function ApplyToRequestScreen({ route, navigation }) {
  const { request: r, defaultRate } = route.params;
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [rate, setRate] = useState(defaultRate ? String(Math.round(Number(defaultRate))) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const done = async () => {
    await markApplied(r.id);
    Alert.alert('Application sent', 'The family will review it and reach out. You will be notified if they book you.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  const submit = async () => {
    setError('');
    if (message.trim().length < 20) return setError('Write a short message (at least a sentence) so the family knows why you are a good fit.');
    setSaving(true);
    try {
      await careRequestApi.apply(r.id, { message: message.trim(), proposed_rate: rate ? Number(rate) : null });
      await done();
    } catch (e) {
      const msg = errorMessage(e);
      if (/already applied/i.test(msg)) await done();
      else if (e?.response?.status === 409) {
        // Taken by someone else or expired while they were writing.
        Alert.alert('Job no longer available', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const schedule = SCHEDULE_TYPES.find((s) => s.value === r.schedule_type)?.label;
  const budget = Number(r.budget_max) > 0 ? `${kes(r.budget_min)} – ${kes(r.budget_max)}/hr` : 'Flexible';
  const rows = [
    ['Care for', recipientLabel(r.care_recipient)],
    ['Needs', (r.care_types || []).join(', ') || '—'],
    ['Where', r.location_name || 'Shared after booking'],
    ['When', `${schedule} from ${fmtDate(r.start_date)}${r.end_date ? ` to ${fmtDate(r.end_date)}` : ''}`],
    ['Hours', `${r.hours_per_day} hrs/day${r.days_of_week?.length ? ` · ${r.days_of_week.map((d) => DAYS[d] ?? d).join(', ')}` : ''}`],
    ['Budget', budget],
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={() => navigation.goBack()} title="Apply" subtitle="A warm, specific message gets more replies." />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Card>
            {rows.map(([k, v], i) => (
              <View key={k} style={[s.row, i > 0 && s.divider]}>
                <Text style={[TYPE.caption, { width: 70 }]}>{k}</Text>
                <Text style={[TYPE.label, { flex: 1, fontWeight: '600' }]}>{v}</Text>
              </View>
            ))}
            {r.special_needs ? <Text style={s.notes}>“{r.special_needs}”</Text> : null}
          </Card>

          <Card>
            <Input label="Your message to the family" multiline value={message} onChangeText={setMessage}
              placeholder="Habari! I have 4 years caring for elderly clients with dementia and live 10 minutes away…"
              hint="Mention relevant experience, your availability for their dates and how far you are." />
            <Input label="Your proposed rate (KES / hour)" value={rate} onChangeText={(t) => setRate(t.replace(/\D/g, ''))}
              keyboardType="number-pad" iconName="tag" containerStyle={{ marginBottom: 0 }}
              hint={`Family budget: ${budget}. Bookings bill your profile rate.`} />
          </Card>

          {error ? <Notice>{error}</Notice> : null}
        </View>
      </ScrollView>
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title="Send application" iconName="send" onPress={submit} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: C.borderLight },
  notes:   { marginTop: 10, backgroundColor: C.cardSoft, borderRadius: 12, padding: 10, fontSize: 13, color: C.textBody },
  bar:     { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
