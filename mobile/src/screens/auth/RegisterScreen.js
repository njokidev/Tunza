import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { authApi, BASE_URL } from '../../api';
import { Button, Input, COLORS } from '../../components/ui';

const ROLES = [
  { key: 'patient',   label: '🏥 Patient',   desc: 'I need care services' },
  { key: 'caregiver', label: '👩‍⚕️ Caregiver', desc: 'I provide care services' },
];

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', password2: '', role: 'patient',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.full_name) e.full_name = 'Name is required';
    if (!form.email)     e.email     = 'Email is required';
    if (!form.phone)     e.phone     = 'Phone is required';
    if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.password !== form.password2) e.password2 = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(form);
      Alert.alert(
        'Account Created! 🎉',
        'You can now log in with your credentials.',
        [{ text: 'Login', onPress: () => navigation.replace('Login') }]
      );
    } catch (err) {
      const data = err.response?.data || {};
      const apiMsg = Object.values(data).flat().join('\n');
      const msg = apiMsg || (
        err.response
          ? 'Registration failed.'
          : `Cannot reach server at ${BASE_URL}. Check your API URL and backend network access.`
      );
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>🤝 Tunza</Text>
          <Text style={styles.title}>Create your account</Text>
        </View>

        {/* Role picker */}
        <Text style={styles.sectionLabel}>I am a...</Text>
        <View style={styles.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleCard, form.role === r.key && styles.roleCardActive]}
              onPress={() => set('role', r.key)}
            >
              <Text style={styles.roleEmoji}>{r.label.split(' ')[0]}</Text>
              <Text style={[styles.roleLabel, form.role === r.key && { color: COLORS.primary }]}>
                {r.label.split(' ').slice(1).join(' ')}
              </Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Input label="Full name"       placeholder="Jane Njoki"          value={form.full_name} onChangeText={v => set('full_name', v)} error={errors.full_name} />
          <Input label="Email"           placeholder="jane@example.com"    value={form.email}     onChangeText={v => set('email', v)}     error={errors.email}     keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone (M-Pesa)"  placeholder="0712345678"          value={form.phone}     onChangeText={v => set('phone', v)}     error={errors.phone}     keyboardType="phone-pad" />
          <Input label="Password"        placeholder="Min 8 characters"    value={form.password}  onChangeText={v => set('password', v)}  error={errors.password}  secureTextEntry />
          <Input label="Confirm password" placeholder="Repeat password"    value={form.password2} onChangeText={v => set('password2', v)} error={errors.password2} secureTextEntry />

          <Button title="Create Account" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flexGrow: 1, padding: 24 },
  header:         { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  brand:          { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  title:          { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  sectionLabel:   { fontSize: 14, fontWeight: '600', color: COLORS.muted, marginBottom: 10 },
  roleRow:        { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard:       { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  roleEmoji:      { fontSize: 28, marginBottom: 6 },
  roleLabel:      { fontWeight: '700', fontSize: 15, color: COLORS.text, marginBottom: 2 },
  roleDesc:       { fontSize: 11, color: COLORS.muted, textAlign: 'center' },
  card:           { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  footer:         { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
  footerText:     { color: COLORS.muted },
  link:           { color: COLORS.primary, fontWeight: '700' },
});
