import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Card, Input, Notice, ScreenHeader } from '../components/ui';
import { AreaPicker } from '../components/pickers';
import RecipientForm, { emptyRecipient, recipientError, suggestedCare } from '../components/RecipientForm';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { AGE_GROUPS, PRIVACY_URL, TERMS_URL } from '../lib/constants';
import { errorMessage, fmtDate, fmtPhone, normalizePhone, unwrap } from '../lib/format';

/** Account details + sign out. Patients reach it from the Profile tab; caregivers from their Profile screen. */
export default function AccountScreen({ navigation, route }) {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const isStackScreen = route?.name === 'AccountDetails';

  const save = async () => {
    const phone = normalizePhone(form.phone);
    if (!phone) return Alert.alert('Check your phone number', 'Enter a Kenyan mobile number, e.g. 0712 345 678.');
    if (phone !== user?.phone && user?.phone_verification_required) {
      const ok = await new Promise((res) => Alert.alert('Change phone number?', "We'll text a code to the new number to verify it.",
        [{ text: 'Cancel', style: 'cancel', onPress: () => res(false) }, { text: 'Continue', onPress: () => res(true) }]));
      if (!ok) return;
    }
    setSaving(true);
    try {
      const { data } = await authApi.updateMe({ ...form, phone });
      updateUser(data);
      setEditMode(false);
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err));
    } finally { setSaving(false); }
  };

  const handleLogout = () => Alert.alert('Log out?', 'You will need to sign in again to use Tunza.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  const shortcuts = user?.role === 'patient' ? [
    { icon: 'clipboard', label: 'My care requests', onPress: () => navigation.navigate('MyRequests') },
    { icon: 'calendar', label: 'Bookings', onPress: () => navigation.navigate('Bookings') },
    { icon: 'plus-circle', label: 'Book a caregiver', onPress: () => navigation.navigate('CareNeeds', { path: 'smart_match' }) },
  ] : [];

  const info = [
    { label: 'Email', value: user?.email },
    { label: 'Phone', value: user?.phone ? `${fmtPhone(user.phone)}${user.phone_verified ? '  ✓' : ''}` : '—', color: user?.phone_verified ? C.success : undefined },
    { label: 'Account', value: user?.is_verified ? 'Verified' : 'Pending verification', color: user?.is_verified ? C.success : C.warning },
    { label: 'Member since', value: user?.date_joined ? fmtDate(user.date_joined) : '—' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Profile" onBack={isStackScreen ? () => navigation.goBack() : undefined} />

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={s.hero}>
          <Avatar uri={user?.avatar} name={user?.full_name} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={TYPE.h3}>{user?.full_name}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge label={user?.role} />
              {user?.is_verified ? <Badge label="verified" /> : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => setEditMode((v) => !v)} style={s.editBtn} accessibilityLabel="Edit profile">
            <Feather name={editMode ? 'x' : 'edit-2'} size={16} color={C.primary} />
          </TouchableOpacity>
        </Card>

        {editMode ? (
          <Card>
            <Input label="Full name" value={form.full_name} onChangeText={(v) => setForm((p) => ({ ...p, full_name: v }))} iconName="user" />
            <Input label="Phone (M-Pesa)" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              placeholder="0712 345 678" keyboardType="phone-pad" iconName="phone" />
            <Button title="Save changes" onPress={save} loading={saving} />
          </Card>
        ) : null}

        {shortcuts.length ? (
          <Card noPad>
            {shortcuts.map((r, i) => (
              <TouchableOpacity key={r.label} onPress={r.onPress} style={[s.row, i > 0 && s.divider]} activeOpacity={0.8}>
                <Feather name={r.icon} size={18} color={C.primary} />
                <Text style={[TYPE.label, { flex: 1 }]}>{r.label}</Text>
                <Feather name="chevron-right" size={18} color={C.textFaint} />
              </TouchableOpacity>
            ))}
          </Card>
        ) : null}

        {user?.role === 'patient' ? <HomeCard /> : null}
        {user?.role === 'patient' ? <PeopleCard /> : null}

        <Card noPad>
          {info.map((item, i) => (
            <View key={item.label} style={[s.row, i > 0 && s.divider]}>
              <Text style={[TYPE.caption, { flex: 1 }]}>{item.label}</Text>
              <Text style={[TYPE.label, item.color && { color: item.color }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <View style={s.legal}>
          <Text style={s.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
          <Text style={TYPE.caption}>·</Text>
          <Text style={s.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
        </View>
        {user?.terms_accepted_at ? <Text style={[TYPE.micro, { textAlign: 'center', marginTop: -6 }]}>Accepted {fmtDate(user.terms_accepted_at)}</Text> : null}

        <Button title="Log out" variant="danger-soft" iconName="log-out" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

/** Family's home area + street — pre-fills care requests. */
function HomeCard() {
  const { user, updateUser } = useAuth();
  const [edit, setEdit] = useState(false);
  const [home, setHome] = useState({});
  const [busy, setBusy] = useState(false);
  const open = () => {
    setHome({ location_name: user?.home_area || '', latitude: user?.home_latitude, longitude: user?.home_longitude, address: user?.home_address || '' });
    setEdit(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.updateMe({ home_area: home.location_name, home_address: home.address.trim(),
        home_latitude: home.latitude, home_longitude: home.longitude });
      updateUser(data);
      setEdit(false);
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e));
    } finally { setBusy(false); }
  };
  return (
    <Card>
      <View style={s.cardHead}>
        <Text style={[TYPE.h4, { flex: 1 }]}>Home address</Text>
        {!edit ? <TouchableOpacity onPress={open} hitSlop={8}><Text style={s.action}>{user?.home_area ? 'Change' : 'Add'}</Text></TouchableOpacity> : null}
      </View>
      {!edit ? (
        <Text style={TYPE.body}>{user?.home_area ? `${user.home_address ? `${user.home_address}, ` : ''}${user.home_area}` : 'Add where care usually happens so we can fill it in for you.'}</Text>
      ) : (
        <>
          <AreaPicker value={home} onChange={(loc) => setHome((h) => ({ ...h, ...loc }))} />
          <Input label="Estate, street or building" value={home.address} onChangeText={(address) => setHome((h) => ({ ...h, address }))}
            iconName="home" containerStyle={{ marginTop: 16, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Cancel" variant="outline" size="sm" onPress={() => setEdit(false)} style={{ flex: 1 }} />
            <Button title="Save" size="sm" onPress={save} loading={busy} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </Card>
  );
}

/** The people this family books care for. */
function PeopleCard() {
  const [people, setPeople] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyRecipient);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => authApi.recipients().then((r) => setPeople(unwrap(r.data))).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    const err = recipientError(draft);
    if (err) return setError(err);
    setBusy(true);
    try {
      await authApi.addRecipient({ ...draft, care_recipient: suggestedCare(draft) });
      setAdding(false); setDraft(emptyRecipient); setError('');
      load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = (p) => Alert.alert(`Remove ${p.is_self ? 'yourself' : p.name}?`, 'Past bookings are not affected.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => authApi.deleteRecipient(p.id).then(load).catch((e) => Alert.alert('Could not remove', errorMessage(e))) },
  ]);
  return (
    <Card>
      <View style={s.cardHead}>
        <Text style={[TYPE.h4, { flex: 1 }]}>People you book care for</Text>
        {!adding ? <TouchableOpacity onPress={() => setAdding(true)} hitSlop={8}><Text style={s.action}>Add</Text></TouchableOpacity> : null}
      </View>
      {people.length === 0 && !adding ? <Text style={TYPE.body}>No one saved yet.</Text> : null}
      {people.map((p, i) => (
        <View key={p.id} style={[s.person, i > 0 && s.divider]}>
          <Feather name={p.is_self ? 'user' : 'users'} size={16} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={TYPE.label}>{p.is_self ? 'Me' : p.name}</Text>
            <Text style={TYPE.caption}>{[p.relationship, AGE_GROUPS.find((a) => a.value === p.age_group)?.label].filter(Boolean).join(' · ')}</Text>
          </View>
          <TouchableOpacity onPress={() => remove(p)} hitSlop={8} accessibilityLabel={`Remove ${p.name}`}>
            <Feather name="trash-2" size={16} color={C.textFaint} />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={{ marginTop: 12 }}>
          <RecipientForm value={draft} onChange={(r) => { setDraft(r); setError(''); }} />
          {error ? <Notice style={{ marginTop: 12 }}>{error}</Notice> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button title="Cancel" variant="outline" size="sm" onPress={() => { setAdding(false); setDraft(emptyRecipient); }} style={{ flex: 1 }} />
            <Button title="Save" size="sm" onPress={add} loading={busy} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  action:   { fontSize: 13, fontWeight: '700', color: C.primary },
  person:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  legal:    { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink:{ fontSize: 12, fontWeight: '600', color: C.textMuted, textDecorationLine: 'underline' },
  hero:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  editBtn: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: C.borderLight },
});
