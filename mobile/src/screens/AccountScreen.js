import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Input, Button, Card, Badge, COLORS } from '../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../theme';

export default function AccountScreen() {
  const { user, updateUser, logout } = useAuth();
  const [form,       setForm]        = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [saving,     setSaving]      = useState(false);
  const [loggingOut, setLoggingOut]  = useState(false);
  const [editMode,   setEditMode]    = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateMe(form);
      updateUser(data);
      setEditMode(false);
      Alert.alert('Saved ✅', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save changes.');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        await logout();
      }},
    ]);
  };

  const ROLE_COLORS = { admin: C.danger, patient: C.primary, caregiver: C.success };

  const infoItems = [
    { label: 'Email',        value: user?.email },
    { label: 'Role',         value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1), color: ROLE_COLORS[user?.role] },
    { label: 'Account Status', value: user?.is_verified ? 'Verified ✅' : 'Pending Verification', color: user?.is_verified ? C.success : C.warning },
    { label: 'Member Since', value: new Date(user?.date_joined).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}>

      {/* Profile hero */}
      <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <Avatar uri={user?.avatar} name={user?.full_name} size={80} ring />
        <Text style={s.heroName}>{user?.full_name}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Badge label={user?.role} />
          {user?.is_verified && <Badge label="verified" />}
        </View>
        <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(!editMode)}>
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>
            {editMode ? 'Cancel' : '✏ Edit Profile'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ padding: 16, gap: 12 }}>

        {/* Edit form */}
        {editMode && (
          <Card>
            <Text style={s.sectionTitle}>Edit Profile</Text>
            <Input label="Full Name" value={form.full_name}
              onChangeText={v => setForm(p => ({ ...p, full_name: v }))}
              placeholder="Your full name" icon="👤" />
            <Input label="Phone" value={form.phone}
              onChangeText={v => setForm(p => ({ ...p, phone: v }))}
              placeholder="0712345678" keyboardType="phone-pad" icon="📱" />
            <Button title="Save Changes" onPress={save} loading={saving} />
          </Card>
        )}

        {/* Account details */}
        <Card>
          <Text style={s.sectionTitle}>Account Details</Text>
          {infoItems.map((item, i) => (
            <View key={i} style={[s.infoRow, i === infoItems.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={TYPE.caption}>{item.label}</Text>
              <Text style={[TYPE.h4, item.color && { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Danger zone */}
        <Card style={[s.dangerCard, { borderColor: C.dangerLight }]}>
          <Text style={[s.sectionTitle, { color: C.danger }]}>Account Actions</Text>
          <Button
            title="Log Out"
            variant="danger"
            onPress={handleLogout}
            loading={loggingOut}
            icon="🚪"
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero:        { paddingTop: 64, paddingBottom: 28, alignItems: 'center', gap: 6 },
  heroName:    { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 10 },
  editBtn:     { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.pill },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  dangerCard:  { borderWidth: 1 },
});
