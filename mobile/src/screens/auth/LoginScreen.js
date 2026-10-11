import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Cannot reach server. Check your API URL and backend network access.';
      Alert.alert('Login Failed', msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">

        {/* ── Purple gradient hero ── */}
        <LinearGradient colors={GRADIENT.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
          <View style={s.logoCircle}>
            <Text style={{fontSize:32}}>🤝</Text>
          </View>
          <Text style={s.brand}>Tunza</Text>
          <Text style={s.tagline}>Quality care, at your doorstep</Text>
        </LinearGradient>

        {/* ── White form card ── */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Welcome back</Text>
          <Text style={s.formSub}>Sign in to continue</Text>

          <Input
            label="Email address"
            placeholder="you@example.com"
            icon="✉"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={v => setForm(p => ({...p, email:v}))}
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            icon="🔒"
            secureTextEntry
            value={form.password}
            onChangeText={v => setForm(p => ({...p, password:v}))}
            error={errors.password}
          />

          <Button title="Sign In" onPress={handleLogin} loading={loading} style={{marginTop:8}} />

          <View style={s.dividerRow}>
            <View style={s.line}/><Text style={s.dividerTxt}>or</Text><View style={s.line}/>
          </View>

          <View style={s.footer}>
            <Text style={{color:C.textMuted, fontSize:14}}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{color:C.primary, fontWeight:'700', fontSize:14}}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero:       { paddingTop:72, paddingBottom:48, alignItems:'center' },
  logoCircle: { width:72, height:72, borderRadius:36, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:12 },
  brand:      { fontSize:34, fontWeight:'800', color:'#fff', letterSpacing:-0.5 },
  tagline:    { fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:4 },
  formCard:   { flex:1, backgroundColor:C.card, borderTopLeftRadius:32, borderTopRightRadius:32, marginTop:-24, paddingHorizontal:24, paddingTop:32, paddingBottom:40, ...SHADOWS.lg },
  formTitle:  { fontSize:24, fontWeight:'800', color:C.text, marginBottom:4 },
  formSub:    { fontSize:14, color:C.textMuted, marginBottom:24 },
  dividerRow: { flexDirection:'row', alignItems:'center', gap:12, marginVertical:20 },
  line:       { flex:1, height:1, backgroundColor:C.border },
  dividerTxt: { fontSize:12, color:C.textFaint, fontWeight:'500' },
  footer:     { flexDirection:'row', justifyContent:'center', alignItems:'center' },
});
