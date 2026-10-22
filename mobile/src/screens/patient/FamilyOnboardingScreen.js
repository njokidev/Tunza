import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import RecipientForm, { emptyRecipient, recipientError, suggestedCare } from '../../components/RecipientForm';
import { AreaPicker } from '../../components/pickers';
import { Button, Input, Notice } from '../../components/ui';
import { COLORS as C, SHADOWS, TYPE } from '../../theme';
import { errorMessage, firstName } from '../../lib/format';

/**
 * First-run setup for families (shown once after sign-up, skippable):
 *  1. Who is the care for — me, or someone else (name, relationship, age group)
 *  2. Where care usually happens — home area + estate/street
 * Both pre-fill every future care request.
 */
export default function FamilyOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState(emptyRecipient);
  const [home, setHome] = useState({ location_name: '', latitude: null, longitude: null, address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finish = async (skip = false) => {
    setBusy(true);
    setError('');
    try {
      if (!skip) {
        await authApi.addRecipient({ ...recipient, care_recipient: suggestedCare(recipient) });
        if (home.location_name) {
          await authApi.updateMe({
            home_area: home.location_name, home_address: home.address.trim(),
            home_latitude: home.latitude, home_longitude: home.longitude,
          });
        }
      }
      const { data } = await authApi.completeOnboarding();
      updateUser(data); // needs_onboarding false → navigator moves on
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const next = () => {
    const err = recipientError(recipient);
    if (err) return setError(err);
    setError('');
    setStep(1);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <View style={st.top}>
          <Text style={st.stepTxt}>Step {step + 1} of 2</Text>
          <TouchableOpacity onPress={() => finish(true)} hitSlop={10} disabled={busy}>
            <Text style={st.skip}>Skip for now</Text>
          </TouchableOpacity>
        </View>
        <View style={st.bars}>
          {[0, 1].map((i) => <View key={i} style={[st.bar, i <= step && { backgroundColor: C.primary }]} />)}
        </View>

        {step === 0 ? (
          <>
            <Text style={[TYPE.h1, { marginTop: 18 }]}>Karibu, {firstName(user?.full_name)}!</Text>
            <Text style={[TYPE.bodyMd, { marginTop: 6, marginBottom: 20 }]}>Who is the care for? We'll use this to suggest the right caregivers.</Text>
            <RecipientForm value={recipient} onChange={(r) => { setRecipient(r); setError(''); }} />
          </>
        ) : (
          <>
            <Text style={[TYPE.h1, { marginTop: 18 }]}>Where will care happen?</Text>
            <Text style={[TYPE.bodyMd, { marginTop: 6, marginBottom: 20 }]}>
              Usually {recipient.is_self ? 'your' : `${recipient.name.trim() || 'their'}${recipient.name.trim() ? "'s" : ''}`} home. You can change it for each booking.
            </Text>
            <AreaPicker value={home} onChange={(loc) => setHome((h) => ({ ...h, ...loc }))} />
            <View style={{ marginTop: 20 }}>
              <Input label="Estate, street or building" value={home.address} onChangeText={(address) => setHome((h) => ({ ...h, address }))}
                placeholder="e.g. Kileleshwa Gardens, Hse 12, Othaya Rd" iconName="home" />
            </View>
            <Notice kind="info">Your exact address is only shared with a caregiver after you book them.</Notice>
          </>
        )}
        {error ? <Notice style={{ marginTop: 16 }}>{error}</Notice> : null}
      </ScrollView>

      <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {step === 0 ? (
          <Button title="Continue" onPress={next} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Back" variant="outline" onPress={() => setStep(0)} style={{ flex: 1 }} />
            <Button title={home.location_name ? 'Finish' : 'Finish without area'} onPress={() => finish(false)} loading={busy} style={{ flex: 2 }} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  top:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTxt: { fontSize: 12, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  skip:    { fontSize: 14, fontWeight: '700', color: C.primary },
  bars:    { flexDirection: 'row', gap: 6, marginTop: 10 },
  bar:     { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.border },
  footer:  { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
