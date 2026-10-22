import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { DAYS, DAYS_LONG, DAY_GROUPS, SHIFT_PRESETS } from '../lib/constants';

const hhmm = (t) => (t ? t.slice(0, 5) : '');
const ampm = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
};
const presetFor = (start, end) => SHIFT_PRESETS.find((p) => p.start === hhmm(start) && p.end === hhmm(end));
const hoursLabel = (d) => {
  const p = presetFor(d.start, d.end);
  return p ? `${p.label} · ${p.sub}` : `${ampm(d.start)} – ${ampm(d.end)}`;
};

export const weekFromSlots = (slots) => DAYS.map((_, i) => {
  const x = slots.find((s) => s.day === i);
  return x ? { on: true, start: hhmm(x.start_time), end: hhmm(x.end_time) } : { on: false, start: '08:00', end: '17:00' };
});

/** "Mon–Fri · Daytime", "Sat, Sun · Overnight", … for the summary line. */
function summarise(week) {
  const groups = [];
  week.forEach((d, i) => {
    if (!d.on) return;
    const key = hoursLabel(d);
    const last = groups[groups.length - 1];
    if (last && last.key === key && last.days[last.days.length - 1] === i - 1) last.days.push(i);
    else groups.push({ key, days: [i] });
  });
  return groups.map((g) => {
    const days = g.days.length > 2 ? `${DAYS[g.days[0]]}–${DAYS[g.days[g.days.length - 1]]}` : g.days.map((i) => DAYS[i]).join(', ');
    return `${days} · ${g.key}`;
  });
}

/** The week as API slots: [{ day, start_time, end_time }] for days that are on. */
export const slotsFromWeek = (week) => week
  .map((d, day) => (d.on ? { day, start_time: d.start, end_time: d.end } : null))
  .filter(Boolean);

/**
 * Weekly availability: switch days on and tap your usual shift.
 * Each day can have its own shift (tap the hours under the day).
 * Controlled: `week` comes from weekFromSlots(); the profile's Save button
 * sends slotsFromWeek(week) in one request (PUT /caregivers/availability/).
 */
export default function WeekAvailability({ week, onChange }) {
  const [usual, setUsual] = useState('day');
  const [openDay, setOpenDay] = useState(null);
  const setWeek = (fn) => onChange(fn(week));

  useEffect(() => {
    const first = week.find((d) => d.on);
    const p = first && presetFor(first.start, first.end);
    if (p) setUsual(p.key);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const usualPreset = SHIFT_PRESETS.find((p) => p.key === usual) || SHIFT_PRESETS[0];

  const update = (i, patch) => setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const pickUsual = (p) => {
    setUsual(p.key);
    setWeek((w) => w.map((d) => (d.on ? { ...d, start: p.start, end: p.end } : d)));
  };
  const pickDays = (days) => {
    setWeek((w) => w.map((d, i) => (days.includes(i)
      ? { on: true, start: d.on ? d.start : usualPreset.start, end: d.on ? d.end : usualPreset.end }
      : { ...d, on: false })));
  };
  const toggleDay = (i, on) => update(i, on ? { on, start: usualPreset.start, end: usualPreset.end } : { on });

  const onDays = week.map((d, i) => (d.on ? i : -1)).filter((i) => i >= 0);
  const summary = summarise(week);

  return (
    <Card>
      <Text style={st.h}>Weekly availability</Text>
      <Text style={[TYPE.caption, { marginBottom: 14 }]}>Turn on the days you work and pick your usual hours. Families are matched to the days you choose.</Text>

      {/* 1. Usual hours */}
      <Text style={st.step}>Your usual hours</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {SHIFT_PRESETS.map((p) => {
          const on = usual === p.key;
          return (
            <TouchableOpacity key={p.key} onPress={() => pickUsual(p)} activeOpacity={0.85} style={[st.shift, on && st.shiftOn]}>
              <Text style={[st.shiftLbl, on && { color: '#fff' }]}>{p.label}</Text>
              <Text style={[st.shiftSub, on && { color: 'rgba(255,255,255,0.85)' }]}>{p.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2. Days */}
      <View style={st.stepRow}>
        <Text style={[st.step, { marginTop: 0, marginBottom: 0, flex: 1 }]}>Days</Text>
        {DAY_GROUPS.map((g) => {
          const on = g.days.length === onDays.length && g.days.every((d) => onDays.includes(d));
          return (
            <TouchableOpacity key={g.label} onPress={() => pickDays(on ? [] : g.days)} style={[st.quick, on && st.quickOn]} activeOpacity={0.85}>
              <Text style={[st.quickTxt, on && { color: C.primary }]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={st.days}>
        {week.map((d, i) => (
          <View key={DAYS[i]} style={[st.dayRow, i > 0 && st.divider]}>
            <View style={st.dayTop}>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.label, !d.on && { color: C.textMuted }]}>{DAYS_LONG[i]}</Text>
                {d.on ? (
                  <TouchableOpacity onPress={() => setOpenDay(openDay === i ? null : i)} hitSlop={6} style={st.hoursBtn}>
                    <Text style={st.hoursTxt}>{hoursLabel(d)}</Text>
                    <Feather name={openDay === i ? 'chevron-up' : 'edit-2'} size={12} color={C.primary} />
                  </TouchableOpacity>
                ) : <Text style={TYPE.caption}>Not available</Text>}
              </View>
              <Switch value={d.on} onValueChange={(v) => toggleDay(i, v)}
                trackColor={{ true: C.primary, false: C.border }} thumbColor="#fff"
                accessibilityLabel={`Available on ${DAYS_LONG[i]}`} />
            </View>
            {d.on && openDay === i ? (
              <View style={[st.wrap, { marginTop: 10 }]}>
                {SHIFT_PRESETS.map((p) => {
                  const on = p.start === d.start && p.end === d.end;
                  return (
                    <TouchableOpacity key={p.key} onPress={() => { update(i, { start: p.start, end: p.end }); setOpenDay(null); }}
                      style={[st.mini, on && st.quickOn]} activeOpacity={0.85}>
                      <Text style={[st.quickTxt, on && { color: C.primary }]}>{p.label} <Text style={{ fontWeight: '500' }}>{p.sub}</Text></Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={st.summary}>
        <Feather name="calendar" size={14} color={C.textMuted} style={{ marginTop: 2 }} />
        <Text style={[TYPE.caption, { flex: 1 }]}>
          {summary.length ? summary.join('\n') : 'No days selected — families can still book you, but you rank lower in Smart Match.'}
        </Text>
      </View>

    </Card>
  );
}

const st = StyleSheet.create({
  h:        { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  step:     { fontSize: 12, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stepRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 6 },
  shift:    { minWidth: 92, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  shiftOn:  { backgroundColor: C.primary, borderColor: C.primary },
  shiftLbl: { fontSize: 14, fontWeight: '800', color: C.text },
  shiftSub: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 2 },
  quick:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  quickOn:  { borderColor: C.primary, backgroundColor: C.primaryXLight },
  quickTxt: { fontSize: 12, fontWeight: '700', color: C.textBody },
  days:     { borderWidth: 1, borderColor: C.borderLight, borderRadius: RADIUS.md, paddingHorizontal: 12 },
  dayRow:   { paddingVertical: 10 },
  dayTop:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider:  { borderTopWidth: 1, borderTopColor: C.borderLight },
  hoursBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, alignSelf: 'flex-start' },
  hoursTxt: { fontSize: 12, fontWeight: '700', color: C.primary },
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mini:     { paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  summary:  { flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 10 },
});
