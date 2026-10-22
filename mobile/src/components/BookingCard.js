import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { bookingApi } from '../api';
import { Avatar, Button, Card, StatusPill } from './ui';
import PinSheet, { FamilyPin } from './PinSheet';
import { COLORS as C, RADIUS, TYPE } from '../theme';
import { BOOKING_STATUS } from '../lib/constants';
import { careTypeLabel, caregiverNet, errorMessage, fmtDay, fmtPhone, fmtTime, isSameDay, kes } from '../lib/format';

// What each role can do from each status (mirrors UpdateBookingStatusView and web Bookings.jsx).
const ACTIONS = {
  caregiver: {
    pending: [
      { status: 'rejected', label: 'Decline', variant: 'outline', icon: 'x', confirm: 'Decline this booking request?' },
      { status: 'accepted', label: 'Accept', variant: 'primary', icon: 'check' },
    ],
    // Both need the PIN the family reads out on the day (see PinSheet).
    accepted: [{ status: 'ongoing', label: 'Check in & start', variant: 'primary', icon: 'map-pin', gps: true, pin: 'start' }],
    ongoing: [{ status: 'completed', label: 'Check out & end', variant: 'success', icon: 'check-circle', gps: true, pin: 'end' }],
  },
  patient: {
    pending: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: 'x', confirm: 'Cancel this booking request?' }],
    accepted: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: 'x', confirm: 'Cancel this confirmed booking?' }],
  },
};

/** Where the phone is now, for GPS check-in / check-out. null if not allowed or unavailable. */
async function currentPosition() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
    ]);
    return p ? { latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) } : null;
  } catch {
    return null;
  }
}

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
  const [pinFor, setPinFor] = useState(null);   // the action waiting for a PIN
  const other = role === 'caregiver' ? b.patient : b.caregiver?.user;
  const actions = ACTIONS[role]?.[b.status] ?? [];

  /** PIN-gated actions: GPS fix, then send with the PIN. Returns an error for the sheet. */
  const actWithPin = async (a, pin) => {
    try {
      const pos = a.gps ? await currentPosition() : null;
      const { data } = await bookingApi.setStatus(b.id, a.status, { pin, ...(pos || {}) });
      setPinFor(null);
      onChange?.(data);
      if (a.gps && data[a.status === 'ongoing' ? 'check_in_distance_m' : 'check_out_distance_m'] > 500) {
        Alert.alert('Location noted', "You seem to be more than 500 m from the care address. That's fine if the family moved — Tunza may check in with you.");
      }
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  };

  const act = async (a) => {
    if (a.pin) { setPinFor(a); return; }
    if (a.confirm && !(await ask(a.label, a.confirm))) return;
    setBusy(a.status);
    try {
      let extra = {};
      if (a.gps) {
        const pos = await currentPosition();
        if (!pos && !(await ask('Location not available', `We couldn't get your location. ${a.status === 'ongoing' ? 'Start' : 'End'} the visit without GPS check-${a.status === 'ongoing' ? 'in' : 'out'}? The family and Tunza will see it wasn't recorded.`))) {
          setBusy(null);
          return;
        }
        extra = pos || {};
      }
      const { data } = await bookingApi.setStatus(b.id, a.status, extra);
      onChange?.(data);
      if (a.gps && data[a.status === 'ongoing' ? 'check_in_distance_m' : 'check_out_distance_m'] > 500) {
        Alert.alert('Location noted', "You seem to be more than 500 m from the care address. That's fine if the family moved — Tunza may check in with you.");
      }
    } catch (e) {
      Alert.alert('Could not update booking', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const chat = () => other?.id && navigation.navigate('Chat', { otherUserId: other.id, otherName: other.full_name });
  const contact = b.contact || {};
  const otherPhone = role === 'caregiver' ? contact.patient_phone : contact.caregiver_phone;
  const showContact = !compact && ['pending', 'accepted', 'ongoing'].includes(b.status);

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
              <Text style={st.lineTxt} numberOfLines={2}>
                {b.address}
                {role === 'caregiver' && contact.unlocked === false ? <Text style={st.locked}>  · full address after {contact.unlocks_when === 'paid' ? 'payment' : 'you accept'}</Text> : null}
              </Text>
            </View>
          ) : null}
          {role === 'caregiver' && b.family_rating?.count ? (
            <View style={st.line}>
              <Feather name="star" size={13} color={C.star} />
              <Text style={st.lineTxt}>Family rated {b.family_rating.avg} by {b.family_rating.count} caregiver{b.family_rating.count === 1 ? '' : 's'}</Text>
            </View>
          ) : null}
          {b.status === 'rejected' && b.decline_reason ? (
            <View style={st.line}>
              <Feather name="info" size={13} color={C.textFaint} />
              <Text style={st.lineTxt}>{b.decline_reason}</Text>
            </View>
          ) : null}
          {b.check_in_at && !compact ? (
            <View style={st.line}>
              <Feather name="navigation" size={13} color={b.check_in_flagged ? C.warning : C.success} />
              <Text style={st.lineTxt}>
                Checked in {fmtTime(b.check_in_at)}{b.check_in_distance_m != null ? ` (${b.check_in_distance_m} m from address)` : ' (no GPS)'}
                {b.check_out_at ? ` · out ${fmtTime(b.check_out_at)}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {b.special_needs && !compact ? <Text style={st.notes}>{b.special_needs}</Text> : null}

      {showContact && contact.unlocked && otherPhone ? (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:+${otherPhone}`)} style={st.call} activeOpacity={0.85}>
          <Feather name="phone" size={15} color={C.primary} />
          <Text style={st.callTxt}>Call {role === 'caregiver' ? 'the family' : 'your caregiver'} · {fmtPhone(otherPhone)}</Text>
        </TouchableOpacity>
      ) : null}
      {showContact && contact.unlocked === false && role === 'patient' && b.status === 'pending' ? (
        <Text style={[TYPE.caption, { marginTop: 10 }]}>Your address and phone are shared with the caregiver once they accept. They have 30 minutes to reply.</Text>
      ) : null}

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
        {role === 'caregiver' && b.status === 'completed' && !b.family_review ? (
          <Button title="Rate family" size="sm" variant="secondary" iconName="star"
            onPress={() => navigation.navigate('RateFamily', { booking: b })} />
        ) : null}
        {role === 'caregiver' && b.family_review ? (
          <View style={st.reviewed}><Feather name="check-circle" size={14} color={C.success} /><Text style={st.reviewedTxt}>Rated</Text></View>
        ) : null}
        {role === 'patient' && b.review ? (
          <View style={st.reviewed}><Feather name="check-circle" size={14} color={C.success} /><Text style={st.reviewedTxt}>Reviewed</Text></View>
        ) : null}
      </View>

      {role === 'patient' ? <FamilyPin visitPin={b.visit_pin} caregiverName={other?.full_name} /> : null}
      {role === 'caregiver' && b.visit_pin?.locked ? (
        <Text style={[st.lineTxt, { color: C.danger, marginTop: 10 }]}>Too many wrong PINs. Contact Tunza support to continue.</Text>
      ) : null}

      {actions.length > 0 ? (
        <View style={st.actions}>
          {actions.map((a) => (
            <Button key={a.status} title={a.label} size="sm" variant={a.variant} iconName={a.icon}
              onPress={() => act(a)} loading={busy === a.status} disabled={!!busy} style={{ flex: 1 }} />
          ))}
        </View>
      ) : null}
      <PinSheet visible={!!pinFor} which={pinFor?.pin} familyName={other?.full_name}
        onSubmit={(pin) => actWithPin(pinFor, pin)} onClose={() => setPinFor(null)} />
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
  locked:   { fontSize: 12, color: C.textFaint },
  call:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight },
  callTxt:  { fontSize: 13, fontWeight: '700', color: C.primary },
});
