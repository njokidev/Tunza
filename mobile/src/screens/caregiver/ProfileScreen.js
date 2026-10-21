import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authApi, caregiverApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Badge, Button, Card, Chip, Input, LoadingScreen, Notice, ScreenHeader } from '../../components/ui';
import { AreaPicker, TimeChips } from '../../components/pickers';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import { DAYS, DAYS_LONG } from '../../lib/constants';
import { errorMessage, fmtShortTime, unwrap } from '../../lib/format';

const levelFor = (years) => (years >= 5 ? 'senior' : years >= 2 ? 'mid' : 'junior');

/** Caregiver profile editor (web: caregiver/ProfileEditor.jsx) — what families see. */
export default function CaregiverProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [account, setAccount] = useState({ full_name: user?.full_name ?? '', phone: user?.phone ?? '' });
  const [specs, setSpecs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ kind: '', text: '' });

  const load = useCallback(async () => {
    try {
      const [p, sp, av] = await Promise.all([caregiverApi.me(), caregiverApi.specializations(), caregiverApi.availability()]);
      const prof = p.data;
      setSpecs(unwrap(sp.data));
      setSlots(unwrap(av.data).sort((a, b) => a.day - b.day));
      setForm({
        bio: prof.bio ?? '',
        years_exp: String(prof.years_exp ?? 0),
        hourly_rate: String(Math.round(Number(prof.hourly_rate ?? 500))),
        is_available: prof.is_available ?? true,
        id_number: '',
        location_name: prof.location_name ?? '',
        latitude: prof.latitude,
        longitude: prof.longitude,
        specialization_ids: (prof.specializations ?? []).map((s) => s.id),
      });
    } catch (e) {
      setStatus({ kind: 'error', text: errorMessage(e) });
    }
  }, []);

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
  const toggleSpec = (id) => set({
    specialization_ids: form.specialization_ids.includes(id)
      ? form.specialization_ids.filter((x) => x !== id)
      : [...form.specialization_ids, id],
  });

  const save = async () => {
    setSaving(true);
    setStatus({ kind: '', text: '' });
    try {
      const years = Number(form.years_exp) || 0;
      const payload = { ...form, years_exp: years, experience: levelFor(years), hourly_rate: Number(form.hourly_rate) || 0 };
      if (!payload.id_number) delete payload.id_number;
      await caregiverApi.updateMe(payload);
      if (account.full_name !== user.full_name || account.phone !== (user.phone ?? '')) {
        const { data: me } = await authApi.updateMe(account);
        updateUser(me);
      }
      set({ id_number: '' });
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
                {user?.is_verified ? <Badge label="verified" /> : <Badge label="pending" />}
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')} style={s.smallBtn}>
              <Feather name="credit-card" size={16} color={C.primary} />
            </TouchableOpacity>
          </Card>

          {status.text ? <Notice kind={status.kind}>{status.text}</Notice> : null}

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
          </Card>

          {/* Area */}
          <Card>
            <Text style={s.h}>Where you work</Text>
            <Text style={[TYPE.caption, { marginBottom: 12 }]}>Distance is part of the match score and shows on open jobs.</Text>
            <AreaPicker value={form} onChange={(loc) => set(loc)} />
          </Card>

          {/* Specialties */}
          <Card>
            <Text style={s.h}>Specialties</Text>
            <Text style={[TYPE.caption, { marginBottom: 12 }]}>Specialty is the biggest part of the match score.</Text>
            <View style={s.wrap}>
              {specs.length === 0 ? <Text style={TYPE.body}>No specialties set up yet.</Text> : specs.map((sp) => (
                <Chip key={sp.id} label={sp.name} active={form.specialization_ids.includes(sp.id)} onPress={() => toggleSpec(sp.id)} />
              ))}
            </View>
          </Card>

          {/* Availability (saves immediately) */}
          <AvailabilityEditor slots={slots} setSlots={setSlots} />

          {/* Verification */}
          {!user?.is_verified ? (
            <Card>
              <Text style={s.h}>Verification</Text>
              <Input label="National ID number" keyboardType="number-pad" value={form.id_number}
                onChangeText={(t) => set({ id_number: t.replace(/\D/g, '').slice(0, 10) })}
                placeholder="e.g. 12345678" hint="Tunza checks your ID before families can find you." containerStyle={{ marginBottom: 0 }} />
            </Card>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate('AccountDetails')} style={s.linkRow}>
            <Feather name="settings" size={17} color={C.textBody} />
            <Text style={[TYPE.label, { flex: 1 }]}>Account details</Text>
            <Feather name="chevron-right" size={18} color={C.textFaint} />
          </TouchableOpacity>
          <Button title="Log out" variant="danger-soft" iconName="log-out"
            onPress={() => Alert.alert('Log out?', 'You will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
        </View>
      </ScrollView>

      <View style={s.bar}>
        <Button title="Save profile" iconName="check" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

function AvailabilityEditor({ slots, setSlots }) {
  const taken = new Set(slots.map((x) => x.day));
  const free = DAYS.map((d, i) => i).filter((i) => !taken.has(i));
  const [draft, setDraft] = useState({ day: free[0] ?? 0, start_time: '08:00', end_time: '17:00' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taken.has(draft.day) && free.length) setDraft((x) => ({ ...x, day: free[0] }));
  }, [slots]); 

  const add = async () => {
    setError('');
    if (draft.end_time <= draft.start_time) return setError('End time must be after start time.');
    setBusy(true);
    try {
      const { data } = await caregiverApi.addAvailability(draft);
      setSlots((list) => [...list, data].sort((a, b) => a.day - b.day));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await caregiverApi.delAvailability(id);
      setSlots((list) => list.filter((x) => x.id !== id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Card>
      <Text style={s.h}>Weekly availability</Text>
      <Text style={[TYPE.caption, { marginBottom: 8 }]}>Availability is 25% of the match score. Changes save immediately.</Text>
      {slots.length === 0 ? <Text style={[TYPE.body, { paddingVertical: 6 }]}>No days added yet.</Text> : slots.map((x, i) => (
        <View key={x.id} style={[s.slot, i > 0 && s.divider]}>
          <Text style={[TYPE.label, { width: 100 }]}>{DAYS_LONG[x.day]}</Text>
          <Text style={[TYPE.body, { flex: 1 }]}>{fmtShortTime(x.start_time)} – {fmtShortTime(x.end_time)}</Text>
          <TouchableOpacity onPress={() => remove(x.id)} hitSlop={8} accessibilityLabel={`Remove ${DAYS_LONG[x.day]}`}>
            <Feather name="trash-2" size={16} color={C.textFaint} />
          </TouchableOpacity>
        </View>
      ))}
      {free.length > 0 ? (
        <View style={s.addBox}>
          <View style={s.wrap}>
            {free.map((i) => <Chip key={i} label={DAYS[i]} active={draft.day === i} onPress={() => setDraft((d) => ({ ...d, day: i }))} />)}
          </View>
          <Text style={s.mini}>From</Text>
          <TimeChips value={draft.start_time} onChange={(t) => setDraft((d) => ({ ...d, start_time: t }))} from={5} to={22} />
          <Text style={s.mini}>To</Text>
          <TimeChips value={draft.end_time} onChange={(t) => setDraft((d) => ({ ...d, end_time: t }))} from={6} to={23} disabledBefore={draft.start_time} />
          <Button title={`Add ${DAYS_LONG[draft.day]}`} variant="secondary" size="sm" iconName="plus" loading={busy} onPress={add} style={{ marginTop: 12 }} />
        </View>
      ) : null}
      {error ? <Notice style={{ marginTop: 10 }}>{error}</Notice> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  idCard:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallBtn:  { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h:         { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
  wrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider:   { borderTopWidth: 1, borderTopColor: C.borderLight },
  addBox:    { marginTop: 10, backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 12 },
  mini:      { fontSize: 12, fontWeight: '700', color: C.textMuted, marginTop: 12, marginBottom: 6 },
  linkRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.borderLight },
  bar:       { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
