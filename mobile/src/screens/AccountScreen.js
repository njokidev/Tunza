import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Input, Button, Card, COLORS, Badge } from '../../components/ui';

export default function AccountScreen() {
  const { user, updateUser, logout }   = useAuth();
  const [form,    setForm]    = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [saving,  setSaving]  = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateMe(form);
      updateUser(data);
      Alert.alert('Saved ✅', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        await logout();
      }},
    ]);
  };

  const ROLE_COLOR = { admin: COLORS.secondary, patient: COLORS.primary, caregiver: COLORS.success };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 60 }}>
      <Text style={styles.title}>Account</Text>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <Avatar uri={user?.avatar} name={user?.full_name} size={80} />
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Badge label={user?.role} />
          {user?.is_verified && <Badge label="verified" />}
        </View>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Edit Profile</Text>
        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={v => setForm(p => ({ ...p, full_name: v }))}
          placeholder="Jane Njoki"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={v => setForm(p => ({ ...p, phone: v }))}
          placeholder="0712345678"
          keyboardType="phone-pad"
        />
        <Button title="Save Changes" onPress={save} loading={saving} style={{ marginTop: 4 }} />
      </Card>

      <Card style={{ marginTop: 0 }}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={[styles.detailValue, { color: ROLE_COLOR[user?.role], fontWeight: '700' }]}>
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Member since</Text>
          <Text style={styles.detailValue}>{new Date(user?.date_joined).toLocaleDateString()}</Text>
        </View>
      </Card>

      <Button
        title="Log Out"
        variant="danger"
        onPress={handleLogout}
        loading={loggingOut}
        style={{ marginTop: 8, backgroundColor: COLORS.danger }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  title:         { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  name:          { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  email:         { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:   { fontSize: 14, color: COLORS.muted },
  detailValue:   { fontSize: 14, color: COLORS.text },
});
