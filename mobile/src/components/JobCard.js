import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { CARE_RECIPIENTS, DAYS, JOB_STATE, SCHEDULE_TYPES } from '../lib/constants';
import { firstName, fmtDate, kes, recipientLabel, timeAgo } from '../lib/format';

/**
 * An open care request a caregiver can apply to (web: caregiver/JobCard.jsx).
 * Jobs that were taken by someone else or whose start date passed stay visible
 * for a couple of days, greyed out with a badge, instead of silently vanishing.
 */
export default function JobCard({ request: r, distance, inArea, applied, onApply }) {
  const schedule = SCHEDULE_TYPES.find((s) => s.value === r.schedule_type)?.label;
  const icon = CARE_RECIPIENTS.find((c) => c.value === r.care_recipient)?.icon || 'heart';
  const state = r.job_state || 'open';
  const closed = state !== 'open';
  const js = JOB_STATE[state] || JOB_STATE.closed;
  const nurseLocked = !closed && r.requires_nurse && r.can_apply === false && !applied;
  return (
    <Card style={[{ marginBottom: 12 }, closed && st.closedCard]}>
      {closed ? (
        <View style={[st.banner, { backgroundColor: js.bg }]}>
          <Feather name={js.icon} size={14} color={js.fg} />
          <Text style={[st.bannerTxt, { color: js.fg }]}>{js.label}</Text>
          <Text style={[st.bannerNote, { color: js.fg }]} numberOfLines={1}>· {applied && state === 'taken' ? 'The family picked another caregiver.' : js.note}</Text>
        </View>
      ) : null}
      <View style={[st.top, closed && { opacity: 0.55 }]}>
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

      {!closed && (inArea || r.requires_nurse) ? (
        <View style={st.tags}>
          {inArea ? <View style={st.tag}><Feather name="map-pin" size={11} color={C.success} /><Text style={[st.tagTxt, { color: C.success }]}>In your area</Text></View> : null}
          {r.requires_nurse ? <View style={[st.tag, { backgroundColor: C.primaryXLight }]}><Feather name="award" size={11} color={C.primary} /><Text style={[st.tagTxt, { color: C.primary }]}>Verified nurses only</Text></View> : null}
        </View>
      ) : null}

      <View style={[{ gap: 5, marginTop: 12 }, closed && { opacity: 0.55 }]}>
        <View style={st.line}>
          <Feather name="map-pin" size={13} color={C.textFaint} />
          <Text style={st.lineTxt}>
            {r.location_name || 'Location on request'}
            {distance !== null && distance !== undefined && distance >= 0.5 ? <Text style={{ fontWeight: '700', color: C.text }}>  · {distance.toFixed(1)} km away</Text> : null}
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

      {r.special_needs && !closed ? <Text style={st.notes} numberOfLines={3}>{r.special_needs}</Text> : null}

      <View style={st.footer}>
        <Text style={[TYPE.micro, { flex: 1 }]}>Posted {timeAgo(r.created_at)}{r.patient?.full_name ? ` by ${firstName(r.patient.full_name)}` : ''}</Text>
        {closed ? (
          <Text style={[st.closedTxt, { color: js.fg }]}>{applied ? 'You applied · ' : ''}No longer available</Text>
        ) : applied ? (
          <View style={st.applied}><Feather name="check-circle" size={15} color={C.success} /><Text style={st.appliedTxt}>Applied</Text></View>
        ) : nurseLocked ? (
          <View style={st.applied}><Feather name="lock" size={14} color={C.textMuted} /><Text style={[st.appliedTxt, { color: C.textMuted }]}>Nurses only</Text></View>
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
  closedCard: { backgroundColor: C.cardSoft },
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, marginBottom: 12 },
  bannerTxt:  { fontSize: 12, fontWeight: '800' },
  bannerNote: { flex: 1, fontSize: 12, fontWeight: '500' },
  closedTxt:  { fontSize: 12, fontWeight: '700' },
  tags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: C.successLight },
  tagTxt:     { fontSize: 11, fontWeight: '700' },
});
