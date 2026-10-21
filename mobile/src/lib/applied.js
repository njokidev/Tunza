import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

// The API has no "my applications" endpoint yet, so remember which open requests
// this caregiver applied to on the device (web does the same with localStorage).
const KEY = 'tunza_applied';
const MAX = 40; // SecureStore values should stay under ~2 KB

async function read() {
  try { return new Set(JSON.parse((await SecureStore.getItemAsync(KEY)) || '[]')); } catch { return new Set(); }
}

export async function markApplied(id) {
  const set = await read();
  set.add(id);
  try { await SecureStore.setItemAsync(KEY, JSON.stringify([...set].slice(-MAX))); } catch { /* ignore */ }
}

/** Set of request ids applied to; refreshed whenever the screen regains focus. */
export function useAppliedJobs() {
  const [applied, setApplied] = useState(new Set());
  useFocusEffect(useCallback(() => {
    let alive = true;
    read().then((s) => alive && setApplied(s));
    return () => { alive = false; };
  }, []));
  return applied;
}
