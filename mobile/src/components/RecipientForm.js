import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Chip, Input } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { AGE_GROUPS, CARE_RECIPIENTS, RELATIONSHIPS } from '../lib/constants';

export const emptyRecipient = { is_self: null, name: '', relationship: '', age_group: '', care_recipient: '' };

/** Fills in the care_recipient a child gets by default, etc. */
export function suggestedCare(r) {
  if (r.care_recipient) return r.care_recipient;
  if (r.age_group === 'child') return 'child';
  if (r.age_group === 'elderly') return 'elderly';
  return '';
}

export function recipientError(r) {
  if (r.is_self === null) return 'Choose who the care is for.';
  if (!r.is_self && !r.name.trim()) return 'Add their name.';
  if (!r.age_group) return 'Choose an age group.';
  return '';
}

/**
 * "Who is receiving care?" — me or someone else, with name, relationship,
 * age group and (optionally) the kind of care they need.
 */
export default function RecipientForm({ value: r, onChange, showSelfChoice = true }) {
  const set = (patch) => onChange({ ...r, ...patch });
  return (
    <View>
      {showSelfChoice ? (
        <View style={st.pair}>
          {[
            { v: true, icon: 'user', t: 'Me', d: "I'm booking care for myself" },
            { v: false, icon: 'users', t: 'Someone else', d: 'A parent, child, spouse or relative' },
          ].map((o) => {
            const on = r.is_self === o.v;
            return (
              <TouchableOpacity key={o.t} activeOpacity={0.85} onPress={() => set({ is_self: o.v, ...(o.v ? { name: '', relationship: '' } : {}) })}
                style={[st.choice, on && st.choiceOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <View style={[st.icon, on && { backgroundColor: C.primary }]}><Feather name={o.icon} size={18} color={on ? '#fff' : C.primary} /></View>
                <Text style={TYPE.h4}>{o.t}</Text>
                <Text style={[TYPE.caption, { textAlign: 'center' }]}>{o.d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {r.is_self === false ? (
        <>
          <Input label="Their name" value={r.name} onChangeText={(name) => set({ name })} placeholder="e.g. Mama Njeri" iconName="user"
            containerStyle={{ marginTop: 18, marginBottom: 12 }} />
          <Text style={st.label}>Relationship to you</Text>
          <View style={st.wrap}>
            {RELATIONSHIPS.map((x) => <Chip key={x} label={x} active={r.relationship === x} onPress={() => set({ relationship: x })} />)}
          </View>
        </>
      ) : null}

      {r.is_self !== null ? (
        <>
          <Text style={[st.label, { marginTop: 18 }]}>{r.is_self ? 'Your age group' : 'Their age group'}</Text>
          <View style={st.ages}>
            {AGE_GROUPS.map((a) => {
              const on = r.age_group === a.value;
              return (
                <TouchableOpacity key={a.value} onPress={() => set({ age_group: a.value })} activeOpacity={0.85} style={[st.age, on && st.choiceOn]}>
                  <Text style={[TYPE.h4, on && { color: C.primary }]}>{a.label}</Text>
                  <Text style={TYPE.caption}>{a.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[st.label, { marginTop: 18 }]}>What do they mostly need? <Text style={TYPE.caption}>(optional)</Text></Text>
          <View style={st.wrap}>
            {CARE_RECIPIENTS.filter((c) => c.value !== 'other').map((c) => (
              <Chip key={c.value} label={c.short} iconName={c.icon} active={(r.care_recipient || suggestedCare(r)) === c.value}
                onPress={() => set({ care_recipient: r.care_recipient === c.value ? '' : c.value })} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  pair:     { flexDirection: 'row', gap: 10 },
  choice:   { flex: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  choiceOn: { borderColor: C.primary, backgroundColor: C.primaryXLight },
  icon:     { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 10 },
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ages:     { flexDirection: 'row', gap: 8 },
  age:      { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
});
