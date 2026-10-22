import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authApi, caregiverApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Button, Card, Chip, Input, LoadingScreen, Notice, ScreenHeader, StatusPill } from '../../components/ui';
import { WorkAreasPicker } from '../../components/pickers';
import WeekAvailability, { slotsFromWeek, weekFromSlots } from '../../components/WeekAvailability';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import { AREAS, LANGUAGES, VERIFICATION_STATUS, isNurseOnly } from '../../lib/constants';
import { errorMessage, fmtPhone, normalizePhone, unwrap } from '../../lib/format';
import confirm from '../../lib/confirm';

const levelFor = (years) => (years >= 5 ? 'senior' : years >= 2 ? 'mid' : 'junior');

/** Caregiver profile editor (web: caregiver/ProfileEditor.jsx) — what families see. */
export default function CaregiverProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [account, setAccount] = useState({ full_name: user?.full_name ?? '', phone: fmtPhone(user?.phone) });
  const [specs, setSpecs] = useState([]);
  const [week, setWeek] = useState(weekFromSlots([]));
  const [savedWeek, setSavedWeek] = useState('');
  const [verification, setVerification] = useState({ status: 'not_submitted', nurse: false });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ kind: '', text: '' });

  const load = useCallback(async () => {
    try {
      const [p, sp, av] = await Promise.all([caregiverApi.me(), caregiverApi.specializations(), caregiverApi.availability()]);
      const prof = p.data;
      setSpecs(unwrap(sp.data));
      const w = weekFromSlots(unwrap(av.data));
      setWeek(w);
      setSavedWeek(JSON.stringify(w));
      setForm({
        bio: prof.bio ?? '',
        years_exp: String(prof.years_exp ?? 0),
        hourly_rate: String(Math.round(Number(prof.hourly_rate ?? 500))),
        is_available: prof.is_available ?? true,
        work_areas: prof.work_areas?.length ? prof.work_areas : (prof.location_name ? [prof.location_name] : []),
        languages: prof.languages ?? [],
        gender: prof.gender ?? '',
        day_shift_rate: prof.day_shift_rate ? String(Math.round(Number(prof.day_shift_rate))) : '',
        night_shift_rate: prof.night_shift_rate ? String(Math.round(Number(prof.night_shift_rate))) : '',
        payout_phone: prof.payout_phone ? fmtPhone(prof.payout_phone) : '',
        specialization_ids: (prof.specializations ?? []).map((s) => s.id),
      });
      setVerification({ status: prof.verification_status ?? 'not_submitted', nurse: !!prof.nurse_verified });
    } catch (e) {
      setStatus({ kind: 'error', text: errorMessage(e) });
    }
  }, []);

  // Reload when coming back from the verification screen.
  useEffect(() => navigation.addListener('focus', () => { if (form) load(); }), [navigation, form, load]);
  useEffect(() => { load(); }, [load]);

  if (!form) {
    return status.text ? (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title="Profile" />
        <View style={{ paddingHorizontal: 20 }}><Notice>{status.text}</Notice>
          <Button title="Try again" style={{ marginTop: 12 }} onPress={load} /></View>
      </View>
    ) : <LoadingScreen />;
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleSpec = (sp) => {
    if (isNurseOnly(sp.name) && !verification.nurse) {
      Alert.alert('Verified nurses only', 'Medication administration is only for caregivers whose nursing or CNA certificate Tunza has verified. Upload it on the verification screen.');
      return;
    }
    toggleSpecId(sp.id);
  };
  const toggleSpecId = (id) => set({
    specialization_ids: form.specialization_ids.includes(id)
      ? form.specialization_ids.filter((x) => x !== id)
      : [...form.specialization_ids, id],
  });

  const save = async () => {
    setSaving(true);
    setStatus({ kind: '', text: '' });
    try {
      const years = Number(form.years_exp) || 0;
      // Home base for distance = the first work area we have coordinates for.
      const base = form.work_areas.map((n) => AREAS.find((a) => a.name.toLowerCase() === n.toLowerCase())).find(Boolean);
      const specIds = form.specialization_ids.filter((id) => {
        const sp = specs.find((x) => x.id === id);
        return verification.nurse || !sp || !isNurseOnly(sp.name);
      });
      if (form.payout_phone && !normalizePhone(form.payout_phone)) {
        throw { response: { data: { detail: 'Payout number: enter a Kenyan M-Pesa number, e.g. 0712 345 678.' } } };
      }
      const payload = {
        ...form, specialization_ids: specIds,
        day_shift_rate: Number(form.day_shift_rate) || null,
        night_shift_rate: Number(form.night_shift_rate) || null,
        payout_phone: form.payout_phone ? normalizePhone(form.payout_phone) : '', years_exp: years, experience: levelFor(years), hourly_rate: Number(form.hourly_rate) || 0,
        location_name: form.work_areas[0] ?? '',
        ...(base ? { latitude: base.lat, longitude: base.lng } : {}),
      };
      await caregiverApi.updateMe(payload);
      if (JSON.stringify(week) !== savedWeek) {
        const { data: slots } = await caregiverApi.saveAvailability(slotsFromWeek(week));
        const w = weekFromSlots(slots);
        setWeek(w);
        setSavedWeek(JSON.stringify(w));
      }
      const phone = normalizePhone(account.phone);
      if (account.full_name !== user.full_name || phone !== (user.phone ?? null)) {
        if (!phone) throw { response: { data: { detail: 'Phone: enter a Kenyan mobile number, e.g. 0712 345 678.' } } };
        const { data: me } = await authApi.updateMe({ full_name: account.full_name, phone });
        updateUser(me);
      }
      setStatus({ kind: 'success', text: 'Profile saved. Families see your changes right away.' });
    } catch (e) {
      setStatus({ kind: 'error', text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Your profile" subtitle="This is what families see when they find you." />

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {/* Identity */}
          <Card style={s.idCard}>
            <Avatar uri={user?.avatar} name={user?.full_name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={TYPE.h4}>{user?.full_name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <StatusPill map={VERIFICATION_STATUS} status={user?.is_verified ? 'approved' : verification.status} />
                {verification.nurse ? <StatusPill map={{ n: { label: 'Verified nurse', bg: C.primaryXLight, fg: C.primary } }} status="n" /> : null}
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')} style={s.smallBtn}>
              <Feather name="credit-card" size={16} color={C.primary} />
            </TouchableOpacity>
          </Card>

          {status.text ? <Notice kind={status.kind}>{status.text}</Notice> : null}

          {/* Verification */}
          {!user?.is_verified ? <VerificationCard status={verification.status} onPress={() => navigation.navigate('Verification')} /> : null}

          {/* Visibility */}
          <Card style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.h4}>Available for new clients</Text>
              <Text style={TYPE.caption}>{form.is_available ? 'Families can find and book you.' : "You won't appear in search."}</Text>
            </View>
            <Switch value={!!form.is_available} onValueChange={(v) => set({ is_available: v })}
              trackColor={{ true: C.success, false: C.border }} thumbColor="#fff" />
          </Card>

          {/* About */}
          <Card>
            <Text style={s.h}>About you</Text>
            <Input label="Full name" value={account.full_name} onChangeText={(v) => setAccount((a) => ({ ...a, full_name: v }))} />
            <Input label="Phone (M-Pesa)" value={account.phone} keyboardType="phone-pad" placeholder="0712 345 678"
              onChangeText={(v) => setAccount((a) => ({ ...a, phone: v }))} />
            <Input label="Bio" multiline value={form.bio} onChangeText={(bio) => set({ bio })}
              placeholder="Your experience, the kind of clients you've cared for, languages you speak…" containerStyle={{ marginBottom: 0 }} />
          </Card>

          {/* Rate & experience */}
          <Card>
            <Text style={s.h}>Rate & experience</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="Hourly rate (KES)" keyboardType="number-pad" value={form.hourly_rate}
                onChangeText={(t) => set({ hourly_rate: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
              <Input label="Years of experience" keyboardType="number-pad" value={form.years_exp}
                onChangeText={(t) => set({ years_exp: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
            </View>
            <Text style={[TYPE.caption, { marginTop: 8 }]}>Most Nairobi caregivers charge KES 400–1,000 per hour.</Text>
            <Text style={[s.sub, { marginTop: 16 }]}>Shift prices <Text style={TYPE.caption}>(optional)</Text></Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="12-hour day (KES)" keyboardType="number-pad" value={form.day_shift_rate} placeholder="e.g. 3500"
                onChangeText={(t) => set({ day_shift_rate: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
              <Input label="Overnight (KES)" keyboardType="number-pad" value={form.night_shift_rate} placeholder="e.g. 3000"
                onChangeText={(t) => set({ night_shift_rate: t.replace(/\D/g, '') })} containerStyle={{ flex: 1, marginBottom: 0 }} />
            </View>
            <Text style={[TYPE.caption, { marginTop: 8 }]}>Used instead of the hourly rate for full-day and overnight bookings.</Text>
          </Card>

          {/* Languages & gender */}
          <Card>
            <Text style={s.h}>Languages you speak</Text>
            <View style={s.wrap}>
              {LANGUAGES.map((l) => (
                <Chip key={l} label={l} active={form.languages.includes(l)}
                  onPress={() => set({ languages: form.languages.includes(l) ? form.languages.filter((x) => x !== l) : [...form.languages, l] })} />
              ))}
            </View>
            <Text style={[s.sub, { marginTop: 16 }]}>Gender</Text>
            <View style={s.wrap}>
              {[['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
                <Chip key={v} label={l} active={form.gender === v} onPress={() => set({ gender: form.gender === v ? '' : v })} />
              ))}
            </View>
            <Text style={[TYPE.caption, { marginTop: 8 }]}>Some families ask for a caregiver of a particular gender or language.</Text>
          </Card>

          {/* Areas */}
          <Card>
            <Text style={s.h}>Areas you work in</Text>
            <Text style={[TYPE.caption, { marginBottom: 12 }]}>Pick every area you can travel to. Jobs in these areas show first and rank you higher in Smart Match.</Text>
            <WorkAreasPicker value={form.work_areas} onChange={(work_areas) => set({ work_areas })} />
          </Card>

          {/* Specialties */}
          <Card>
            <Text style={s.h}>Specialties</Text>
            <Text style={[TYPE.caption, { marginBottom: 12 }]}>Specialty is the biggest part of the match score.</Text>
            <View style={s.wrap}>
              {specs.length === 0 ? <Text style={TYPE.body}>No specialties set up yet.</Text> : specs.map((sp) => {
                const locked = isNurseOnly(sp.name) && !verification.nurse;
                return (
                  <Chip key={sp.id} label={sp.name} active={form.specialization_ids.includes(sp.id) && !locked}
                    iconName={locked ? 'lock' : undefined} onPress={() => toggleSpec(sp)}
                    style={locked ? { opacity: 0.6 } : undefined} />
                );
              })}
            </View>
          </Card>

          {/* Availability */}
          <WeekAvailability week={week} onChange={setWeek} />

          {/* Payouts */}
          <Card>
            <Text style={s.h}>M-Pesa payout number</Text>
            <Input value={form.payout_phone} keyboardType="phone-pad" placeholder={fmtPhone(user?.phone) || '0712 345 678'}
              onChangeText={(payout_phone) => set({ payout_phone })} iconName="smartphone"
              hint={form.payout_phone ? 'Tunza sends your earnings to this number.' : `Leave empty to be paid on your account phone (${fmtPhone(user?.phone)}).`}
              containerStyle={{ marginBottom: 0 }} />
          </Card>

          {user?.is_verified ? (
            <TouchableOpacity onPress={() => navigation.navigate('Verification')} style={s.linkRow}>
              <Feather name="shield" size={17} color={C.success} />
              <Text style={[TYPE.label, { flex: 1 }]}>Verification & documents</Text>
              <Feather name="chevron-right" size={18} color={C.textFaint} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate('AccountDetails')} style={s.linkRow}>
            <Feather name="settings" size={17} color={C.textBody} />
            <Text style={[TYPE.label, { flex: 1 }]}>Account details</Text>
            <Feather name="chevron-right" size={18} color={C.textFaint} />
          </TouchableOpacity>
          <Button title="Log out" variant="danger-soft" iconName="log-out"
            onPress={async () => { if (await confirm('Log out?', 'You will need to sign in again.', 'Log out', { destructive: true })) logout(); }} />
        </View>
      </ScrollView>

      <View style={s.bar}>
        <Button title="Save profile" iconName="check" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const VERIFY_COPY = {
  not_submitted: { icon: 'upload-cloud', title: 'Get verified to start getting jobs', sub: 'Upload your ID, Certificate of Good Conduct and any certificates. Takes about 5 minutes.', cta: 'Upload documents', tone: C.primary },
  pending:       { icon: 'clock',        title: 'Background check in progress',      sub: "Thank you for applying. We'll get back to you within 2–3 days.", cta: 'View application', tone: C.warning },
  rejected:      { icon: 'alert-circle', title: 'Your application needs changes',     sub: 'See what to fix and upload your documents again.', cta: 'Fix and resubmit', tone: C.danger },
};

function VerificationCard({ status, onPress }) {
  const v = VERIFY_COPY[status] || VERIFY_COPY.not_submitted;
  return (
    <Card style={{ borderColor: v.tone, borderWidth: 1 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Feather name={v.icon} size={20} color={v.tone} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={TYPE.h4}>{v.title}</Text>
          <Text style={[TYPE.caption, { marginTop: 2 }]}>{v.sub}</Text>
        </View>
      </View>
      <Button title={v.cta} size="sm" variant={status === 'pending' ? 'secondary' : 'primary'} onPress={onPress} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
    </Card>
  );
}

const s = StyleSheet.create({
  idCard:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallBtn:  { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h:         { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
  wrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sub:       { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
  linkRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.borderLight },
  bar:       { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
