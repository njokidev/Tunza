import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { bookingApi } from '../api';
import { Avatar, Button, Card, StatusPill } from './ui';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { BOOKING_STATUS } from '../lib/constants';
import { careTypeLabel, caregiverNet, errorMessage, fmtDay, fmtTime, isSameDay, kes } from '../lib/format';

// What each role can do from each status (mirrors UpdateBookingStatusView and web Bookings.jsx).
const ACTIONS = {
  caregiver: {
    pending: [
      { status: 'rejected', label: 'Decline', variant: 'outline', icon: 'x', confirm: 'Decline this booking request?' },
      { status: 'accepted', label: 'Accept', variant: 'primary', icon: 'check' },
    ],
    accepted: [{ status: 'ongoing', label: 'Start visit', variant: 'primary', icon: 'play' }],
    ongoing: [{ status: 'completed', label: 'End visit', variant: 'success', icon: 'check-circle', confirm: 'Mark this visit as complete? Payment will be released to you.' }],
  },
  patient: {
    pending: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: 'x', confirm: 'Cancel this booking request?' }],
    accepted: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: 'x', confirm: 'Cancel this confirmed booking?' }],
  },
};

const ask = (title, message) => new Promise((resolve) =>
  Alert.alert(title, message, [
    { text: 'No', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Yes', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));

/**
 * One booking, with the actions the signed-in role can take on it.
 * `onChange(updated)` is called with the server's copy after a status change.
 */
export default function BookingCard({ booking: b, role, onChange, navigation, compact }) {
  const [busy, setBusy] = useState(null);
  const other = role === 'caregiver' ? b.patient : b.caregiver?.user;
  const actions = ACTIONS[role]?.[b.status] ?? [];

  const act = async (a) => {
    if (a.confirm && !(await ask(a.label, a.confirm))) return;
    setBusy(a.status);
    try {
      const { data } = await bookingApi.setStatus(b.id, a.status);
      onChange?.(data);
    } catch (e) {
      Alert.alert('Could not update booking', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const chat = () => other?.id && navigation.navigate('Chat', { otherUserId: other.id, otherName: other.full_name });

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={st.top}>
        <Avatar uri={other?.avatar} name={other?.full_name} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={st.nameRow}>
            <Text style={[TYPE.h4, { flexShrink: 1 }]} numberOfLines={1}>{other?.full_name || '—'}</Text>
            <StatusPill map={BOOKING_STATUS} status={b.status} />
          </View>
          <Text style={st.care}>{careTypeLabel(b.care_type)}</Text>
          <View style={st.line}>
            <Feather name="clock" size={13} color={C.textFaint} />
            <Text style={st.lineTxt}>
              {fmtDay(b.start_date)}, {fmtTime(b.start_date)} – {isSameDay(b.start_date, b.end_date) ? '' : `${fmtDay(b.end_date)}, `}{fmtTime(b.end_date)}
            </Text>
          </View>
          {!compact ? (
            <View style={st.line}>
              <Feather name="map-pin" size={13} color={C.textFaint} />
              <Text style={st.lineTxt} numberOfLines={2}>{b.address}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {b.special_needs && !compact ? <Text style={st.notes}>{b.special_needs}</Text> : null}

      <View style={st.footer}>
        <View style={{ flex: 1 }}>
          <Text style={st.amount}>{kes(role === 'caregiver' ? caregiverNet(b.total_amount) : b.total_amount)}</Text>
          <Text style={TYPE.caption}>
            {role === 'caregiver' ? 'You earn, after 12.5% fee' : b.is_paid ? 'Paid' : 'Estimated total'}
          </Text>
        </View>
        {other && b.status !== 'rejected' ? (
          <TouchableOpacity onPress={chat} style={st.iconBtn} accessibilityLabel="Message">
            <Feather name="message-circle" size={18} color={C.textBody} />
          </TouchableOpacity>
        ) : null}
        {role === 'patient' && b.status === 'ongoing' ? (
          <Button title="Track" size="sm" variant="secondary" iconName="map-pin"
            onPress={() => navigation.navigate('TrackCaregiver', { bookingId: b.id })} />
        ) : null}
        {role === 'patient' && b.status === 'completed' && !b.review ? (
          <Button title="Review" size="sm" variant="secondary" iconName="star"
            onPress={() => navigation.navigate('Review', { booking: b })} />
        ) : null}
        {role === 'patient' && b.review ? (
          <View style={st.reviewed}><Feather name="check-circle" size={14} color={C.success} /><Text style={st.reviewedTxt}>Reviewed</Text></View>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={st.actions}>
          {actions.map((a) => (
            <Button key={a.status} title={a.label} size="sm" variant={a.variant} iconName={a.icon}
              onPress={() => act(a)} loading={busy === a.status} disabled={!!busy} style={{ flex: 1 }} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  top:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nameRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  care:     { fontSize: 13, fontWeight: '700', color: C.primary, marginTop: 2 },
  line:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 5 },
  lineTxt:  { flex: 1, fontSize: 13, color: C.textBody },
  notes:    { marginTop: 12, backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 10, fontSize: 13, color: C.textBody },
  footer:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight },
  amount:   { fontSize: 17, fontWeight: '800', color: C.text },
  iconBtn:  { width: 38, height: 38, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewedTxt: { fontSize: 12, fontWeight: '700', color: C.success },
  actions:  { flexDirection: 'row', gap: 8, marginTop: 12 },
});
