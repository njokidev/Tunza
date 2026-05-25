import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../api';
import { Button, Input, COLORS } from '../../components/ui';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      // Navigation handled by root navigator based on user.role
    } catch (err) {
      const msg = err.response?.data?.detail || (
        err.response
          ? 'Invalid email or password.'
          : `Cannot reach server at ${BASE_URL}. Check your API URL and backend network access.`
      );
      Alert.alert('Login Failed', msg);
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
        {/* Logo / Hero */}
        <View style={styles.hero}>
          <Text style={styles.logo}>🤝</Text>
          <Text style={styles.brand}>Tunza</Text>
          <Text style={styles.tagline}>Connecting patients with caregivers</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Input
            label="Email address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={v => setForm(p => ({ ...p, email: v }))}
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={form.password}
            onChangeText={v => setForm(p => ({ ...p, password: v }))}
            error={errors.password}
          />

          <Button title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flexGrow: 1, padding: 24, justifyContent: 'center' },
  hero:       { alignItems: 'center', marginBottom: 32 },
  logo:       { fontSize: 60 },
  brand:      { fontSize: 36, fontWeight: '800', color: COLORS.primary, marginTop: 8 },
  tagline:    { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  card:       { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  title:      { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle:   { fontSize: 14, color: COLORS.muted, marginBottom: 24 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: COLORS.muted },
  link:       { color: COLORS.primary, fontWeight: '700' },
});
