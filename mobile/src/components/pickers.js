import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, RADIUS } from '../theme';
import { AREAS } from '../lib/constants';
import { addDays, todayISODate } from '../lib/format';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Horizontal strip of upcoming days — no native date picker needed.
 * value / minDate are yyyy-mm-dd strings.
 */
export function DateStrip({ value, onChange, minDate, days = 30, allowClear, clearLabel = 'None' }) {
  const start = minDate || todayISODate();
  const list = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {allowClear ? (
        <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.85} style={[st.day, !value && st.dayOn, { justifyContent: 'center' }]}>
          <Text style={[st.dayNum, { fontSize: 13 }, !value && { color: '#fff' }]}>{clearLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {list.map((iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const on = value === iso;
        const today = iso === todayISODate();
        return (
          <TouchableOpacity key={iso} onPress={() => onChange(iso)} activeOpacity={0.85} style={[st.day, on && st.dayOn]}>
            <Text style={[st.dayWd, on && { color: 'rgba(255,255,255,0.8)' }]}>{today ? 'Today' : WD[dt.getDay()]}</Text>
            <Text style={[st.dayNum, on && { color: '#fff' }]}>{d}</Text>
            <Text style={[st.dayMo, on && { color: 'rgba(255,255,255,0.8)' }]}>{MO[m - 1]}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/** Hourly time chips, value "HH:mm". */
export function TimeChips({ value, onChange, from = 6, to = 21, disabledBefore }) {
  const list = [];
  for (let h = from; h <= to; h += 1) list.push(`${String(h).padStart(2, '0')}:00`);
  // Open scrolled to the selected (or first enabled) time so it's visible.
  const focus = Math.max(0, list.indexOf(value) >= 0 ? list.indexOf(value) - 1 : list.findIndex((t) => !(disabledBefore && t <= disabledBefore)) - 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      contentOffset={{ x: focus * 72, y: 0 }}>
      {list.map((t) => {
        const off = disabledBefore && t <= disabledBefore;
        const on = value === t;
        const h = Number(t.slice(0, 2));
        const label = `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
        return (
          <TouchableOpacity key={t} disabled={off} onPress={() => onChange(t)} activeOpacity={0.85}
            style={[st.time, on && st.dayOn, off && { opacity: 0.35 }]}>
            <Text style={[st.timeTxt, on && { color: '#fff' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * Pick a known area (gives lat/lng for distance matching) or use GPS.
 * value: { location_name, latitude, longitude }
 */
export function AreaPicker({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const known = AREAS.some((a) => a.name === value.location_name);
  const visible = showAll ? AREAS : AREAS.slice(0, 10);

  const useMyLocation = async () => {
    setGeoError('');
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGeoError('Location permission was not granted.'); return; }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = AREAS.reduce((best, a) => {
        const d = (a.lat - coords.latitude) ** 2 + (a.lng - coords.longitude) ** 2;
        return d < best.d ? { a, d } : best;
      }, { a: null, d: Infinity }).a;
      onChange({
        location_name: nearest ? `Near ${nearest.name}` : 'My location',
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6)),
      });
    } catch {
      setGeoError('Could not get your location. Pick an area instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={useMyLocation} activeOpacity={0.85}
        style={[st.locBtn, value.location_name && !known && st.locBtnOn]}>
        {locating ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Feather name="crosshair" size={16} color={COLORS.primary} />}
        <Text style={st.locTxt}>
          {value.location_name && !known ? value.location_name : 'Use my current location'}
        </Text>
      </TouchableOpacity>
      {geoError ? <Text style={st.err}>{geoError}</Text> : null}
      <Text style={st.or}>or choose an area</Text>
      <View style={st.wrap}>
        {visible.map((a) => {
          const on = value.location_name === a.name;
          return (
            <TouchableOpacity key={a.name} activeOpacity={0.85} style={[st.area, on && st.dayOn]}
              onPress={() => onChange({ location_name: a.name, latitude: a.lat, longitude: a.lng })}>
              <Text style={[st.areaTxt, on && { color: '#fff' }]}>{a.name}</Text>
            </TouchableOpacity>
          );
        })}
        {!showAll ? (
          <TouchableOpacity onPress={() => setShowAll(true)} style={[st.area, { borderStyle: 'dashed' }]}>
            <Text style={[st.areaTxt, { color: COLORS.primary }]}>More areas…</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  day:     { width: 58, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', alignItems: 'center' },
  dayOn:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayWd:   { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  dayNum:  { fontSize: 18, fontWeight: '800', color: COLORS.text, marginVertical: 1 },
  dayMo:   { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  time:    { width: 64, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  timeTxt: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  locBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryLight, backgroundColor: COLORS.primaryXLight },
  locBtnOn:{ borderColor: COLORS.primary },
  locTxt:  { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  err:     { color: COLORS.danger, fontSize: 12, marginTop: 6 },
  or:      { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 14, marginBottom: 8 },
  wrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  area:    { paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  areaTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textBody },
});
