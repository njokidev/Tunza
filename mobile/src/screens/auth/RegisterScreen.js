import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS } from '../../theme';

const ROLES = [
  { key:'patient',   emoji:'🏡', title:'Family', desc:'I am looking for care' },
  { key:'caregiver', emoji:'🩺', title:'Caregiver', desc:'I want to give care' },
];

export default function RegisterScreen({ navigation }) {
  const [form,    setForm]    = useState({ full_name:'', email:'', phone:'', password:'', password2:'', role:'patient' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const set = (k,v) => setForm(p => ({...p, [k]:v}));

  const validate = () => {
    const e = {};
    if (!form.full_name) e.full_name = 'Required';
    if (!form.email)     e.email     = 'Required';
    if (!form.phone)     e.phone     = 'Required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.password2) e.password2 = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(form);
      // Sign straight in: patients land on Home (Book a caregiver), caregivers on
      // their dashboard, which walks them through completing their profile.
      try {
        await login(form.email.trim(), form.password);
      } catch {
        Alert.alert('Account created', 'Please sign in with your new details.', [
          { text: 'Sign in', onPress: () => navigation.replace('Login') }]);
      }
    } catch (err) {
      const d = err.response?.data || {};
      Alert.alert('Registration Failed', Object.values(d).flat().join('\n') || 'Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios' ? 'padding' : undefined}>
      <ScrollView style={{flex:1, backgroundColor:C.bg}} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">

        {/* ── Compact gradient header ── */}
        <LinearGradient colors={GRADIENT.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={{color:'#fff', fontSize:18}}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Create Account</Text>
          <Text style={s.headerSub}>Join Tunza today</Text>
        </LinearGradient>

        <View style={s.body}>
          {/* Role selector */}
          <Text style={s.roleLabel}>I am a...</Text>
          <View style={s.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity key={r.key} activeOpacity={0.85}
                style={[s.roleCard, form.role===r.key && s.roleCardActive]}
                onPress={() => set('role', r.key)}>
                <Text style={{fontSize:28}}>{r.emoji}</Text>
                <Text style={[s.roleTitle, form.role===r.key && {color:C.primary}]}>{r.title}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
                {form.role===r.key && (
                  <LinearGradient colors={GRADIENT.primary} style={s.roleCheck}>
                    <Text style={{color:'#fff', fontSize:10, fontWeight:'700'}}>✓</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={s.formCard}>
            <Input label="Full Name"         placeholder="Jane Njoki"       icon="👤" value={form.full_name} onChangeText={v=>set('full_name',v)} error={errors.full_name} />
            <Input label="Email"             placeholder="jane@example.com" icon="✉" value={form.email}     onChangeText={v=>set('email',v)}     error={errors.email} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Phone Number"      placeholder="0712 345 678"     icon="📱" value={form.phone}     onChangeText={v=>set('phone',v)}     error={errors.phone} keyboardType="phone-pad" />
            <Input label="Password"          placeholder="Minimum 8 characters" icon="🔒" value={form.password}  onChangeText={v=>set('password',v)}  error={errors.password}  secureTextEntry />
            <Input label="Confirm Password"  placeholder="Repeat password"  icon="🔒" value={form.password2} onChangeText={v=>set('password2',v)} error={errors.password2} secureTextEntry />
            <Button title="Create Account" onPress={handleRegister} loading={loading} style={{marginTop:4}} />
          </View>

          <View style={s.footer}>
            <Text style={{color:C.textMuted, fontSize:14}}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{color:C.primary, fontWeight:'700', fontSize:14}}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop:56, paddingBottom:36, paddingHorizontal:20 },
  backBtn:     { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:16 },
  headerTitle: { fontSize:26, fontWeight:'800', color:'#fff' },
  headerSub:   { fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:4 },
  body:        { flex:1, backgroundColor:C.bg, borderTopLeftRadius:28, borderTopRightRadius:28, marginTop:-20, padding:20 },
  roleLabel:   { fontSize:13, fontWeight:'600', color:C.textMuted, marginBottom:10, marginTop:4 },
  roleRow:     { flexDirection:'row', gap:12, marginBottom:20 },
  roleCard:    { flex:1, backgroundColor:C.card, borderRadius:RADIUS.lg, padding:14, borderWidth:2, borderColor:C.border, alignItems:'center', position:'relative' },
  roleCardActive:{ borderColor:C.primary, backgroundColor:C.primaryXLight },
  roleTitle:   { fontWeight:'700', fontSize:14, color:C.text, marginTop:6, marginBottom:2 },
  roleDesc:    { fontSize:11, color:C.textMuted, textAlign:'center' },
  roleCheck:   { position:'absolute', top:8, right:8, width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  formCard:    { backgroundColor:C.card, borderRadius:RADIUS.lg, padding:20, ...SHADOWS.card, marginBottom:16 },
  footer:      { flexDirection:'row', justifyContent:'center', paddingBottom:24 },
});
