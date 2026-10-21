import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { CARE_RECIPIENTS, DAYS, SCHEDULE_TYPES } from '../lib/constants';
import { firstName, fmtDate, kes, recipientLabel, timeAgo } from '../lib/format';

/** An open care request a caregiver can apply to (web: caregiver/JobCard.jsx). */
export default function JobCard({ request: r, distance, applied, onApply }) {
  const schedule = SCHEDULE_TYPES.find((s) => s.value === r.schedule_type)?.label;
  const icon = CARE_RECIPIENTS.find((c) => c.value === r.care_recipient)?.icon || 'heart';
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={st.top}>
        <View style={st.icon}><Feather name={icon} size={18} color={C.primary} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={TYPE.h4}>{recipientLabel(r.care_recipient)}</Text>
          {r.care_types?.length ? <Text style={st.types} numberOfLines={2}>{r.care_types.join(', ')}</Text> : null}
        </View>
        {Number(r.budget_max) > 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.budget}>{kes(r.budget_min)}–{Number(r.budget_max).toLocaleString()}</Text>
            <Text style={TYPE.caption}>per hour</Text>
          </View>
        ) : <Text style={TYPE.caption}>Flexible budget</Text>}
      </View>

      <View style={{ gap: 5, marginTop: 12 }}>
        <View style={st.line}>
          <Feather name="map-pin" size={13} color={C.textFaint} />
          <Text style={st.lineTxt}>
            {r.location_name || 'Location on request'}
            {distance !== null && distance !== undefined ? <Text style={{ fontWeight: '700', color: C.text }}>  · {distance.toFixed(1)} km away</Text> : null}
          </Text>
        </View>
        <View style={st.line}>
          <Feather name="calendar" size={13} color={C.textFaint} />
          <Text style={st.lineTxt}>{schedule} from {fmtDate(r.start_date)}{r.end_date ? ` to ${fmtDate(r.end_date)}` : ''}</Text>
        </View>
        <View style={st.line}>
          <Feather name="clock" size={13} color={C.textFaint} />
          <Text style={st.lineTxt}>
            {r.hours_per_day} hrs/day{r.days_of_week?.length ? ` · ${r.days_of_week.map((d) => DAYS[d] ?? d).join(', ')}` : ''}
          </Text>
        </View>
      </View>

      {r.special_needs ? <Text style={st.notes} numberOfLines={3}>{r.special_needs}</Text> : null}

      <View style={st.footer}>
        <Text style={[TYPE.micro, { flex: 1 }]}>Posted {timeAgo(r.created_at)}{r.patient?.full_name ? ` by ${firstName(r.patient.full_name)}` : ''}</Text>
        {applied ? (
          <View style={st.applied}><Feather name="check-circle" size={15} color={C.success} /><Text style={st.appliedTxt}>Applied</Text></View>
        ) : (
          <Button title="Apply" size="sm" iconName="send" onPress={() => onApply(r)} />
        )}
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  top:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon:       { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  types:      { fontSize: 13, color: C.primary, fontWeight: '600', marginTop: 2 },
  budget:     { fontSize: 14, fontWeight: '800', color: C.text },
  line:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lineTxt:    { flex: 1, fontSize: 13, color: C.textBody },
  notes:      { marginTop: 12, backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 10, fontSize: 13, color: C.textBody },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight },
  applied:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appliedTxt: { fontSize: 13, fontWeight: '700', color: C.success },
});
