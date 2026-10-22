import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import confirm from '../../../lib/confirm';
import { COLORS as C } from '../../../theme';

/** "Log out" link for the setup screens, so nobody is stuck in them. */
export default function SetupFooter() {
  const { logout } = useAuth();
  const out = async () => {
    if (await confirm('Log out?', 'Your progress so far is saved. You can finish setting up next time you sign in.', 'Log out', { destructive: true })) logout();
  };
  return (
    <TouchableOpacity onPress={out} hitSlop={10} style={{ alignSelf: 'center', marginTop: 20, padding: 6 }}>
      <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>Log out</Text>
    </TouchableOpacity>
  );
}
