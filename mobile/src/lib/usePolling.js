import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Poll `fn` every `ms` only while the screen is focused AND the app is in the
 * foreground. Runs once immediately on focus. Stops as soon as the user leaves
 * the screen or backgrounds the app, so nothing hits the backend in the dark.
 */
export default function usePolling(fn, ms, deps = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useFocusEffect(useCallback(() => {
    let timer = null;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      try { await fnRef.current(); } finally { inFlight = false; }
    };
    const start = () => { if (!timer) timer = setInterval(tick, ms); };
    const stop  = () => { clearInterval(timer); timer = null; };

    tick();
    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { tick(); start(); } else { stop(); }
    });
    return () => { stop(); sub.remove(); };
  }, [ms, ...deps])); // eslint-disable-line react-hooks/exhaustive-deps
}
