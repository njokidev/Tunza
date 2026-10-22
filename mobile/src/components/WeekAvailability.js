import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
 * Weekly availability in two steps:
 *   1. Which days?  Tap Mon–Sun (or Weekdays / Every day).
 *   2. What hours?  One shift for all those days: a preset, or custom from–to.
 * "Different hours on some days" opens a row per chosen day for exceptions.
 * Controlled: `week` comes from weekFromSlots(); the parent's Save sends
 * slotsFromWeek(week) in one request (PUT /caregivers/availability/).
 */
export default function WeekAvailability({ week, onChange, bare = false }) {
  const onDays = week.map((d, i) => (d.on ? i : -1)).filter((i) => i >= 0);
  const first = week.find((d) => d.on);
  const mixed = onDays.some((i) => week[i].start !== first.start || week[i].end !== first.end);
  const [perDay, setPerDay] = useState(mixed);
  const [hours, setHours] = useState(() => (first ? { start: first.start, end: first.end } : { start: '08:00', end: '17:00' }));
  const [custom, setCustom] = useState(() => !!first && !presetFor(first.start, first.end));
  useEffect(() => { if (mixed) setPerDay(true); }, [mixed]);

  const setWeek = (fn) => onChange(fn(week));
  const applyHours = (h) => {
    setHours(h);
    setWeek((w) => w.map((d) => (d.on ? { ...d, ...h } : d)));
  };
  const toggleDay = (i) => setWeek((w) => w.map((d, j) => (j === i ? (d.on ? { ...d, on: false } : { on: true, ...hours }) : d)));
  const pickDays = (days) => setWeek((w) => w.map((d, i) => (days.includes(i) ? (d.on ? d : { on: true, ...hours }) : { ...d, on: false })));
  const updateDay = (i, patch) => setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const summary = summarise(week);
  const Wrapper = bare ? View : Card;

  return (
    <Wrapper>
      {!bare ? <Text style={st.h}>Weekly availability</Text> : null}
      {!bare ? <Text style={[TYPE.caption, { marginBottom: 6 }]}>Families are matched to the days and hours you choose.</Text> : null}

      {/* 1. Days */}
      <Text style={st.step}>1. Which days can you work?</Text>
      <View style={st.dayChips}>
        {DAYS.map((d, i) => {
          const on = week[i].on;
          return (
            <TouchableOpacity key={d} onPress={() => toggleDay(i)} activeOpacity={0.85}
              style={[st.dayChip, on && st.dayChipOn]} accessibilityRole="checkbox"
              accessibilityState={{ checked: on }} accessibilityLabel={DAYS_LONG[i]}>
              <Text style={[st.dayChipTxt, on && { color: '#fff' }]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[st.wrap, { marginTop: 10 }]}>
        {DAY_GROUPS.map((g) => {
          const on = g.days.length === onDays.length && g.days.every((d) => onDays.includes(d));
          return (
            <TouchableOpacity key={g.label} onPress={() => pickDays(on ? [] : g.days)} style={[st.quick, on && st.quickOn]} activeOpacity={0.85}>
              <Text style={[st.quickTxt, on && { color: C.primary }]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Hours */}
      <Text style={[st.step, { marginTop: 22 }]}>2. What hours?</Text>
      {!onDays.length ? (
        <Text style={TYPE.caption}>Choose your days first.</Text>
      ) : (
        <>
          <View style={st.shiftGrid}>
            {SHIFT_PRESETS.map((p) => {
              const on = !custom && hours.start === p.start && hours.end === p.end;
              return (
                <TouchableOpacity key={p.key} onPress={() => { setCustom(false); applyHours({ start: p.start, end: p.end }); }}
                  activeOpacity={0.85} style={[st.shift, on && st.shiftOn]}>
                  <Text style={[st.shiftLbl, on && { color: '#fff' }]}>{p.label}</Text>
                  <Text style={[st.shiftSub, on && { color: 'rgba(255,255,255,0.85)' }]}>{p.sub}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setCustom(true)} activeOpacity={0.85} style={[st.shift, custom && st.shiftOn]}>
              <Text style={[st.shiftLbl, custom && { color: '#fff' }]}>Custom</Text>
              <Text style={[st.shiftSub, custom && { color: 'rgba(255,255,255,0.85)' }]}>Set your own</Text>
            </TouchableOpacity>
          </View>
          {custom ? (
            <View style={st.customRow}>
              <TimeStepper label="From" value={hours.start} onChange={(start) => applyHours({ ...hours, start })} />
              <Feather name="arrow-right" size={16} color={C.textMuted} style={{ marginTop: 22 }} />
              <TimeStepper label="To" value={hours.end} onChange={(end) => applyHours({ ...hours, end })} />
            </View>
          ) : null}

          <TouchableOpacity onPress={() => setPerDay((v) => !v)} style={st.perDayToggle} activeOpacity={0.8}>
            <Feather name={perDay ? 'check-square' : 'square'} size={16} color={C.primary} />
            <Text style={st.perDayTxt}>Different hours on some days</Text>
          </TouchableOpacity>
          {perDay ? (
            <View style={st.days}>
              {onDays.map((i, k) => (
                <View key={i} style={[st.dayRow, k > 0 && st.divider]}>
                  <Text style={[TYPE.label, { marginBottom: 8 }]}>{DAYS_LONG[i]} · <Text style={{ color: C.primary }}>{hoursLabel(week[i])}</Text></Text>
                  <View style={st.wrap}>
                    {SHIFT_PRESETS.map((p) => {
                      const on = p.start === week[i].start && p.end === week[i].end;
                      return (
                        <TouchableOpacity key={p.key} onPress={() => updateDay(i, { start: p.start, end: p.end })}
                          style={[st.mini, on && st.quickOn]} activeOpacity={0.85}>
                          <Text style={[st.quickTxt, on && { color: C.primary }]}>{p.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}

      <View style={st.summary}>
        <Feather name="calendar" size={14} color={C.textMuted} style={{ marginTop: 2 }} />
        <Text style={[TYPE.caption, { flex: 1 }]}>
          {summary.length ? summary.join('\n') : 'No days chosen yet.'}
        </Text>
      </View>
    </Wrapper>
  );
}

/** Half-hour steps; shows 12-hour time. */
function TimeStepper({ label, value, onChange }) {
  const step = (dir) => {
    const [h, m] = value.split(':').map(Number);
    const mins = (((h * 60 + m + dir * 30) % 1440) + 1440) % 1440;
    onChange(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  };
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.stepperLbl}>{label}</Text>
      <View style={st.stepper}>
        <TouchableOpacity onPress={() => step(-1)} hitSlop={8} accessibilityLabel={`${label} earlier`}><Feather name="minus" size={18} color={C.primary} /></TouchableOpacity>
        <Text style={st.stepperVal}>{ampm(value)}</Text>
        <TouchableOpacity onPress={() => step(1)} hitSlop={8} accessibilityLabel={`${label} later`}><Feather name="plus" size={18} color={C.primary} /></TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  h:        { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  step:     { fontSize: 13, fontWeight: '800', color: C.text, marginTop: 12, marginBottom: 10 },
  dayChips: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayChip:  { flex: 1, aspectRatio: 1, maxWidth: 48, borderRadius: 999, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dayChipOn:{ backgroundColor: C.primary, borderColor: C.primary },
  dayChipTxt:{ fontSize: 12, fontWeight: '800', color: C.textBody },
  shiftGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shift:    { width: '31.5%', paddingVertical: 10, paddingHorizontal: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  shiftOn:  { backgroundColor: C.primary, borderColor: C.primary },
  shiftLbl: { fontSize: 13, fontWeight: '800', color: C.text },
  shiftSub: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginTop: 2 },
  customRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  stepperLbl:{ fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 6 },
  stepper:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  stepperVal:{ fontSize: 15, fontWeight: '800', color: C.text },
  perDayToggle:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, alignSelf: 'flex-start' },
  perDayTxt:{ fontSize: 13, fontWeight: '700', color: C.primary },
  quick:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  quickOn:  { borderColor: C.primary, backgroundColor: C.primaryXLight },
  quickTxt: { fontSize: 12, fontWeight: '700', color: C.textBody },
  days:     { borderWidth: 1, borderColor: C.borderLight, borderRadius: RADIUS.md, paddingHorizontal: 12, marginTop: 10 },
  dayRow:   { paddingVertical: 12 },
  divider:  { borderTopWidth: 1, borderTopColor: C.borderLight },
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mini:     { paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  summary:  { flexDirection: 'row', gap: 8, marginTop: 16, backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 10 },
});
