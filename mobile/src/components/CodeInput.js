import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { COLORS as C, RADIUS } from '../theme';

/** Six boxes for an SMS code, backed by one hidden input (so paste and SMS autofill work). */
export default function CodeInput({ value, onChange, length = 6, error, autoFocus = true }) {
  const ref = useRef(null);
  const digits = value.split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code">
      <View style={st.row}>
        {Array.from({ length }, (_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={[st.box, active && st.boxActive, error && st.boxError]}>
              <Text style={st.digit}>{digits[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        style={st.hidden}
      />
    </Pressable>
  );
}

const st = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box:       { width: 46, height: 56, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: C.primary },
  boxError:  { borderColor: C.danger },
  digit:     { fontSize: 24, fontWeight: '800', color: C.text },
  hidden:    { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
