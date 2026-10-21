import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Card, Input, ScreenHeader } from '../components/ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { errorMessage, fmtDate } from '../lib/format';

/** Account details + sign out. Patients reach it from the Profile tab; caregivers from their Profile screen. */
export default function AccountScreen({ navigation, route }) {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const isStackScreen = route?.name === 'AccountDetails';

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateMe(form);
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
    { label: 'Phone', value: user?.phone || '—' },
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

        <Card noPad>
          {info.map((item, i) => (
            <View key={item.label} style={[s.row, i > 0 && s.divider]}>
              <Text style={[TYPE.caption, { flex: 1 }]}>{item.label}</Text>
              <Text style={[TYPE.label, item.color && { color: item.color }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Button title="Log out" variant="danger-soft" iconName="log-out" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  editBtn: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: C.borderLight },
});
