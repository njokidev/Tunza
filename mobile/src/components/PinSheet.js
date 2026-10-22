import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CodeInput from './CodeInput';
import { Button } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';

/**
 * Bottom sheet where the caregiver types the 4-digit PIN the family gives them.
 * `which` is 'start' or 'end'. `onSubmit(pin)` returns an error string (shown in
 * the sheet) or nothing on success.
 */
export default function PinSheet({ visible, which, familyName, onSubmit, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) { setPin(''); setError(''); } }, [visible]);

  const submit = async () => {
    if (pin.length !== 4) { setError('Enter all 4 digits.'); return; }
    setBusy(true);
    const err = await onSubmit(pin);
    setBusy(false);
    if (err) { setError(err); setPin(''); }
  };

  const start = which === 'start';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.handle} />
          <View style={st.icon}><Feather name={start ? 'unlock' : 'check-circle'} size={22} color={C.primary} /></View>
          <Text style={[TYPE.h3, { textAlign: 'center' }]}>{start ? 'Enter start PIN' : 'Enter end PIN'}</Text>
          <Text style={st.sub}>
            {start
              ? `Ask ${familyName || 'the family'} for the 4-digit start PIN in their Tunza app.`
              : `Ask ${familyName || 'the family'} for the end PIN once the visit is done. This releases your pay.`}
          </Text>
          <CodeInput value={pin} onChange={(v) => { setPin(v); setError(''); }} length={4} error={!!error} />
          {error ? <Text style={st.error}>{error}</Text> : null}
          <Button title={start ? 'Start visit' : 'End visit'} onPress={submit} loading={busy}
            disabled={pin.length !== 4 || busy} style={{ marginTop: 20 }} />
          <Button title="Cancel" variant="ghost" onPress={onClose} disabled={busy} style={{ marginTop: 6 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** What the family sees on an accepted / ongoing booking: the PIN to hand over. */
export function FamilyPin({ visitPin, caregiverName }) {
  if (!visitPin?.pin) return null;
  const start = visitPin.needed === 'start';
  return (
    <View style={st.famBox}>
      <View style={{ flex: 1 }}>
        <Text style={st.famLabel}>{start ? 'START PIN' : 'END PIN'}</Text>
        <Text style={st.famHint}>
          {start
            ? `Give this to ${caregiverName || 'your caregiver'} when they arrive.`
            : 'Give this only when the visit is finished. It releases their pay.'}
        </Text>
      </View>
      <Text style={st.famPin} selectable>{visitPin.pin}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,12,30,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle:   { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 16 },
  icon:     { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  sub:      { fontSize: 14, color: C.textBody, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  error:    { color: C.danger, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  famBox:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 12, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, borderWidth: 1, borderColor: C.primaryLight },
  famLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.primaryDark },
  famHint:  { fontSize: 12, color: C.textBody, marginTop: 2 },
  famPin:   { fontSize: 30, fontWeight: '800', letterSpacing: 6, color: C.primaryDark },
});
