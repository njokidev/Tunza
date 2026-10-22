import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import CodeInput from '../../components/CodeInput';
import { Button, Input, Notice } from '../../components/ui';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import { errorMessage, fmtPhone, normalizePhone } from '../../lib/format';

const RESEND_SECONDS = 60;

/**
 * Shown right after sign-up (and on sign-in) until the phone number is verified.
 * Texts a 6-digit code via Africa's Talking; codes last 5 minutes, 3 tries each.
 */
export default function VerifyPhoneScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const [changing, setChanging] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  const send = useCallback(async () => {
    setSending(true);
    setMsg({ kind: '', text: '' });
    try {
      const { data } = await authApi.sendPhoneCode();
      setSentTo(data.phone || '');
      setDevCode(data.dev_code || '');
      setWait(RESEND_SECONDS);
    } catch (e) {
      const d = e?.response?.data;
      if (d?.code === 'too_soon') {
        const s = Number((d.detail.match(/(\d+) seconds/) || [])[1]) || RESEND_SECONDS;
        setWait(s);
      } else setMsg({ kind: 'error', text: errorMessage(e) });
    } finally {
      setSending(false);
    }
  }, []);

  useEffect(() => { send(); }, [send]);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    setMsg({ kind: '', text: '' });
    try {
      const { data } = await authApi.verifyPhone(value);
      updateUser(data); // phone_verified → navigator moves on
    } catch (e) {
      setMsg({ kind: 'error', text: errorMessage(e) });
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const changeNumber = async () => {
    const n = normalizePhone(newPhone);
    if (!n) return setMsg({ kind: 'error', text: 'Enter a Kenyan mobile number, e.g. 0712 345 678.' });
    setBusy(true);
    try {
      const { data } = await authApi.updateMe({ phone: n });
      updateUser(data);
      setChanging(false);
      setNewPhone('');
      setWait(0);
      await send();
    } catch (e) {
      setMsg({ kind: 'error', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 40, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={st.icon}><Feather name="smartphone" size={30} color="#fff" /></View>
        <Text style={[TYPE.h1, { textAlign: 'center', marginTop: 18 }]}>Verify your phone</Text>
        <Text style={[TYPE.bodyMd, { textAlign: 'center', marginTop: 8 }]}>
          {sentTo ? `We sent a 6-digit code to ${sentTo}.` : sending ? 'Sending your code…' : `We'll text a code to ${fmtPhone(user?.phone)}.`}
          {'\n'}Your number is used for M-Pesa payments and to keep your account safe.
        </Text>

        <View style={{ marginTop: 28 }}>
          <CodeInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }} error={msg.kind === 'error'} />
        </View>

        {devCode ? (
          <Notice kind="info" style={{ marginTop: 16 }}>{`Test mode (no SMS service set up): your code is ${devCode}`}</Notice>
        ) : null}
        {msg.text ? <Notice kind={msg.kind} style={{ marginTop: 16 }}>{msg.text}</Notice> : null}

        <Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6} style={{ marginTop: 24 }} />

        <View style={st.links}>
          <TouchableOpacity onPress={send} disabled={wait > 0 || sending} hitSlop={8}>
            <Text style={[st.link, (wait > 0 || sending) && { color: C.textFaint }]}>
              {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setChanging((v) => !v)} hitSlop={8}>
            <Text style={st.link}>Change number</Text>
          </TouchableOpacity>
        </View>

        {changing ? (
          <View style={st.change}>
            <Input label="New phone number" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad"
              placeholder="0712 345 678" iconName="phone" containerStyle={{ marginBottom: 12 }} />
            <Button title="Use this number" size="sm" variant="secondary" onPress={changeNumber} loading={busy} />
          </View>
        ) : null}

        <TouchableOpacity onPress={logout} style={{ alignSelf: 'center', marginTop: 32 }} hitSlop={8}>
          <Text style={[TYPE.caption, { textDecorationLine: 'underline' }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  icon:   { alignSelf: 'center', width: 72, height: 72, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  links:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  link:   { fontSize: 14, fontWeight: '700', color: C.primary },
  change: { marginTop: 16, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderLight },
});
