import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { authApi } from '../../api';
import CodeInput from '../../components/CodeInput';
import { Button, Input, Notice, PasswordChecklist, PasswordInput, ScreenHeader } from '../../components/ui';
import { passwordChecks } from '../../lib/password';
import { COLORS as C, TYPE } from '../../theme';
import { errorMessage } from '../../lib/format';

/** Forgot password: phone (or email) → SMS code → new password. */
export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState(route.params?.identifier || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checks = passwordChecks(password, {});

  const request = async () => {
    if (!identifier.trim()) return setError('Enter the phone number or email on your account.');
    setBusy(true);
    setError('');
    try {
      const { data } = await authApi.resetRequest(identifier.trim());
      setSentTo(data.phone || '');
      setDevCode(data.dev_code || '');
      setStep(1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== 6) return setError('Enter the 6-digit code from the SMS.');
    if (!checks.every((c) => c.ok)) return setError("Your new password doesn't meet all the requirements.");
    setBusy(true);
    setError('');
    try {
      await authApi.resetConfirm({ identifier: identifier.trim(), code, new_password: password });
      Alert.alert('Password changed', 'Sign in with your new password.', [{ text: 'Sign in', onPress: () => navigation.navigate('Login') }]);
    } catch (e) {
      const d = e?.response?.data;
      setError(d?.new_password ? [].concat(d.new_password).join(' ') : errorMessage(e));
      if (d?.code === 'locked' || d?.code === 'expired' || d?.code === 'no_code') { setCode(''); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Reset password" onBack={() => (step ? setStep(0) : navigation.goBack())}
          subtitle={step === 0 ? "Enter your phone number or email. We'll text a code to the phone on your account."
            : sentTo ? `Enter the code we sent to ${sentTo}, then choose a new password.`
              : 'If an account uses these details, we sent a code to its phone. Enter it below.'} />
        <View style={{ paddingHorizontal: 20 }}>
          {step === 0 ? (
            <>
              <Input label="Phone or email" value={identifier} onChangeText={setIdentifier} autoCapitalize="none"
                placeholder="0712 345 678 or you@example.com" iconName="user" />
              {error ? <Notice style={{ marginBottom: 12 }}>{error}</Notice> : null}
              <Button title="Send code" iconName="message-square" onPress={request} loading={busy} />
            </>
          ) : (
            <>
              <Text style={[TYPE.label, { marginBottom: 10 }]}>SMS code</Text>
              <CodeInput value={code} onChange={setCode} />
              {devCode ? <Notice kind="info" style={{ marginTop: 12 }}>{`Test mode: your code is ${devCode}`}</Notice> : null}
              <View style={{ marginTop: 20 }}>
                <PasswordInput label="New password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters"
                  textContentType="newPassword">
                  <PasswordChecklist checks={checks} touched={password.length > 0} />
                </PasswordInput>
              </View>
              {error ? <Notice style={{ marginBottom: 12 }}>{error}</Notice> : null}
              <Button title="Change password" iconName="lock" onPress={confirm} loading={busy} />
              <Button title="Send a new code" variant="ghost" size="sm" onPress={request} style={{ marginTop: 8 }} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
