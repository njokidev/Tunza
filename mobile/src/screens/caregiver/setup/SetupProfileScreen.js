import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { caregiverApi } from '../../../api';
import { Button, Card, Chip, Input, Notice, ScreenHeader } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { LANGUAGES, isNurseOnly } from '../../../lib/constants';
import { fmtDay, unwrap } from '../../../lib/format';
import { COLORS as C, TYPE } from '../../../theme';
import SetupFooter from './SetupFooter';

const MIN_BIO = 40;
const MIN_RATE = 100;

/**
 * Caregiver setup, step 1 of 3 (right after the documents, while they're checked): the profile
 * families see — bio, experience, rate, the care they offer, languages.
 * Work areas and availability come next.
 */
export default function SetupProfileScreen() {
  const { user, refreshUser } = useAuth();
  const setup = user?.caregiver_setup || {};
  const [specs, setSpecs] = useState([]);
  const [nurse, setNurse] = useState(false);
  const [form, setForm] = useState({
    bio: '', years_exp: '', hourly_rate: '500', day_shift_rate: '', night_shift_rate: '',
    specialization_ids: [], languages: ['English', 'Kiswahili'], gender: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([caregiverApi.specializations(), caregiverApi.me()])
      .then(([sp, me]) => {
        setSpecs(unwrap(sp.data));
        setNurse(!!me.data.nurse_verified);
        // Keep anything they already filled in (e.g. if they logged out half way).
        const p = me.data;
        setForm((f) => ({
          ...f,
          bio: p.bio || f.bio,
          years_exp: p.years_exp ? String(p.years_exp) : f.years_exp,
          languages: p.languages?.length ? p.languages : f.languages,
          gender: p.gender || f.gender,
          specialization_ids: (p.specializations || []).map((s) => s.id),
        }));
      })
      .catch(() => setLoadError('Could not load care types. Pull down or try again.'));
  }, []);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; });
  };
  const toggle = (key, value) => set({
    [key]: form[key].includes(value) ? form[key].filter((x) => x !== value) : [...form[key], value],
  });
  const toggleSpec = (sp) => {
    if (isNurseOnly(sp.name) && !nurse) {
      Alert.alert('Verified nurses only', 'Medication administration is only for caregivers whose nursing or CNA certificate Tunza has verified.');
      return;
    }
    toggle('specialization_ids', sp.id);
  };

  const bioLen = form.bio.trim().length;

  const save = async () => {
    const e = {};
    if (bioLen < MIN_BIO) e.bio = `Write at least ${MIN_BIO} characters (${bioLen}/${MIN_BIO}).`;
    if ((Number(form.hourly_rate) || 0) < MIN_RATE) e.hourly_rate = `At least KES ${MIN_RATE}.`;
    if (!form.specialization_ids.length) e.specialization_ids = 'Choose at least one.';
    if (!form.languages.length) e.languages = 'Choose at least one.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await caregiverApi.setupProfile({
        ...form,
        bio: form.bio.trim(),
        years_exp: Number(form.years_exp) || 0,
        hourly_rate: Number(form.hourly_rate),
        day_shift_rate: Number(form.day_shift_rate) || null,
        night_shift_rate: Number(form.night_shift_rate) || null,
      });
      await refreshUser();   // navigator moves on to work areas
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(' ')])));
      } else {
        setErrors({ _: d?.detail || 'Could not save. Check your connection and try again.' });
      }
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="STEP 1 OF 3" title="Set up your profile"
          subtitle="This is what families see when they find you. A clear, honest profile gets booked faster." />

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {setup.verified ? (
            <Card style={st.approved}>
              <Feather name="shield" size={18} color={C.success} />
              <Text style={[TYPE.label, { flex: 1, color: C.success }]}>You're verified. Families will see a background-checked badge.</Text>
            </Card>
          ) : (
            <Card style={st.pending}>
              <Feather name="clock" size={18} color={C.primaryDark} />
              <Text style={[TYPE.label, { flex: 1, color: C.primaryDark }]}>
                Thank you! We're checking your documents{setup.verification_expected_by ? ` and will get back to you by ${fmtDay(setup.verification_expected_by)}` : ' (2–3 days)'}. Set up your profile now so families can book you as soon as you're approved.
              </Text>
            </Card>
          )}

          {loadError ? <Notice>{loadError}</Notice> : null}

          <Card>
            <Text style={st.h}>About you</Text>
            <Input label="Bio" multiline value={form.bio} onChangeText={(bio) => set({ bio })}
              placeholder="e.g. I have cared for elderly clients with dementia and stroke recovery for 4 years. I'm patient, I cook, and I help with exercises."
              error={errors.bio} hint={!errors.bio ? `${bioLen}/${MIN_BIO} characters minimum` : undefined}
              style={{ minHeight: 110, textAlignVertical: 'top' }} containerStyle={{ marginBottom: 0 }} />
          </Card>

          <Card>
            <Text style={st.h}>Experience & rate</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="Years of experience" keyboardType="number-pad" value={form.years_exp} placeholder="0"
                onChangeText={(t) => set({ years_exp: t.replace(/\D/g, '').slice(0, 2) })} containerStyle={{ flex: 1, marginBottom: 0 }} />
              <Input label="Hourly rate (KES)" keyboardType="number-pad" value={form.hourly_rate} error={errors.hourly_rate}
                onChangeText={(t) => set({ hourly_rate: t.replace(/\D/g, '').slice(0, 5) })} containerStyle={{ flex: 1, marginBottom: 0 }} />
            </View>
            <Text style={[TYPE.caption, { marginTop: 8 }]}>Most caregivers charge KES 400–1,000 an hour. Tunza keeps 12.5%.</Text>
            <Text style={[st.sub, { marginTop: 16 }]}>Shift prices <Text style={TYPE.caption}>(optional)</Text></Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="12-hour day (KES)" keyboardType="number-pad" value={form.day_shift_rate} placeholder="e.g. 3500"
                onChangeText={(t) => set({ day_shift_rate: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
              <Input label="Overnight (KES)" keyboardType="number-pad" value={form.night_shift_rate} placeholder="e.g. 3000"
                onChangeText={(t) => set({ night_shift_rate: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
            </View>
          </Card>

          <Card>
            <Text style={st.h}>Care you offer</Text>
            <View style={st.wrap}>
              {specs.map((sp) => {
                const locked = isNurseOnly(sp.name) && !nurse;
                return (
                  <Chip key={sp.id} label={sp.name} active={form.specialization_ids.includes(sp.id) && !locked}
                    iconName={locked ? 'lock' : undefined} onPress={() => toggleSpec(sp)} style={locked ? { opacity: 0.6 } : undefined} />
                );
              })}
            </View>
            {errors.specialization_ids ? <Text style={st.err}>{errors.specialization_ids}</Text> : null}
          </Card>

          <Card>
            <Text style={st.h}>Languages you speak</Text>
            <View style={st.wrap}>
              {LANGUAGES.map((l) => <Chip key={l} label={l} active={form.languages.includes(l)} onPress={() => toggle('languages', l)} />)}
            </View>
            {errors.languages ? <Text style={st.err}>{errors.languages}</Text> : null}
            <Text style={[st.sub, { marginTop: 16 }]}>Gender <Text style={TYPE.caption}>(optional)</Text></Text>
            <View style={st.wrap}>
              {[['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
                <Chip key={v} label={l} active={form.gender === v} onPress={() => set({ gender: form.gender === v ? '' : v })} />
              ))}
            </View>
            <Text style={[TYPE.caption, { marginTop: 8 }]}>Some families ask for a caregiver of a particular gender or language.</Text>
          </Card>

          {errors._ ? <Notice>{errors._}</Notice> : null}
          <SetupFooter />
        </View>
      </ScrollView>
      <View style={st.bar}>
        <Button title="Continue" iconName="arrow-right" onPress={save} loading={saving} disabled={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  pending:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.primaryXLight, borderColor: C.primaryLight },
  approved: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.successLight, borderColor: C.successLight },
  h:    { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
  sub:  { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  err:  { color: C.danger, fontSize: 12, fontWeight: '600', marginTop: 8 },
  bar:  { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.borderLight },
});
