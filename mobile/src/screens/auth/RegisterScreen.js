import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, StatusBar, 
  AccessibilityInfo} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../../api';
import { Button, Input } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS } from '../../theme';

const ROLES = [
  { key:'patient',   emoji:'🏥', title:'I need care',   desc:'Find trusted care for my loved one' },
  { key:'caregiver', emoji:'👩‍⚕️', title:'I provide care', desc:'Conenct with families who need care' },
];
const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  password2: '',
  role: 'patient',
};

function getErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => {
        const value = Array.isArray(messages)
          ? messages.join(', ')
          : String(messages);

        return `${field.replaceAll('_', ' ')}: ${value}`;
      })
      .join('\n');
  }

  return 'Unable to create your account. Please check your connection and try again.';
}


export default function RegisterScreen({ navigation }) {
  const [form,    setForm]    = useState(INITIAL_FORM);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key,value) => {
    setForm(previous => ({...previous,[key]:value}));

    setErrors(previous =>({
      ...previous,
      [key]: undefined,
    }))
  }

const validate = () => {
    const nextErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = 'Enter your full name.';
    }

    const email = form.email.trim().toLowerCase();

    if (!email) {
      nextErrors.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Enter your phone number.';
    }

    if (form.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }

    if (!form.password2) {
      nextErrors.password2 = 'Confirm your password.';
    } else if (form.password !== form.password2) {
      nextErrors.password2 = 'Passwords do not match.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

const handleRegister = async () => {
    if (loading || !validate()) return;

    setLoading(true);

    try {
      await authApi.register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        password2: form.password2,
        role: form.role,
      });

      Alert.alert(
        'Welcome to Tunza 🎉',
        'Your account has been created. You can now sign in.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.replace('Login'),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        'Registration failed',
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
    style={styles.screen}
    behavior={Platform.OS==='ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      >

        {/* ── Compact gradient header ── */}
        <LinearGradient
        colors={GRADIENT.primary}
        start={{x:0,y:0}}
        end={{x:1,y:1}} 
        style={styles.header}>

          <TouchableOpacity
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Join Tunza</Text>
          <Text style={styles.headerSub}>Trusted Care starts here.</Text>
        </LinearGradient>

        <View style={styles.body}>
           <Text style={styles.heading}>Create your account</Text>
           <Text style={styles.subtitle}>
            First, tell us how you'll use Tunza.
          </Text>

           <Text style={styles.roleLabel}>I want to...</Text>

           <View style={styles.roleRow}>
            {ROLES.map(role => {
              const selected = form.role === role.key;

              return (
                <TouchableOpacity
                  key={role.key}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => set('role', role.key)}
                  style={[
                    styles.roleCard,
                    selected && styles.roleCardActive,
                  ]}
                >
                  <Text style={styles.roleEmoji}>
                    {role.emoji}
                  </Text>

                  <Text
                    style={[
                      styles.roleTitle,
                      selected && styles.roleTitleActive,
                    ]}
                  >
                    {role.title}
                  </Text>

                  <Text style={styles.roleDescription}>
                    {role.desc}
                  </Text>

                  {selected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formCard}>
            <Input
              label="Full name"
              placeholder="Jane Njoki"
              icon="👤"
              value={form.full_name}
              onChangeText={value => set('full_name', value)}
              error={errors.full_name}
              autoCapitalize="words"
            />
            <Input
              label="Email address"
              placeholder="jane@example.com"
              icon="✉"
              value={form.email}
              onChangeText={value => set('email', value)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
             <Input
              label="Phone number"
              placeholder="0712 345 678"
              icon="📱"
              value={form.phone}
              onChangeText={value => set('phone', value)}
              error={errors.phone}
              keyboardType="phone-pad"
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              icon="🔒"
              value={form.password}
              onChangeText={value => set('password', value)}
              error={errors.password}
              secureTextEntry
            />
            <Input
              label="Confirm password"
              placeholder="Enter your password again"
              icon="🔒"
              value={form.password2}
              onChangeText={value => set('password2', value)}
              error={errors.password2}
              secureTextEntry
            />
                        <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
                 <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.signInText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}




const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 42,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#fff',
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  body: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 6,
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    position: 'relative',
  },
  roleCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryXLight,
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  roleTitleActive: {
    color: C.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  checkmark: {
    position: 'absolute',
    right: 8,
    top: 8,
    color: C.primary,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...SHADOWS.card,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerText: {
    color: C.textMuted,
    fontSize: 14,
  },
  signInText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
