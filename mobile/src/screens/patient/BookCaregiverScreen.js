import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingApi, careRequestApi } from '../../api';
import { Avatar, Button, Card, Chip, Input, Notice, Rating, ScreenHeader, VerifiedBadge } from '../../components/ui';
import { DateStrip, TimeChips } from '../../components/pickers';
import { COLORS as C, SHADOWS, TYPE } from '../../theme';
import { BOOKING_CARE_TYPES, RECIPIENT_TO_CARE_TYPE } from '../../lib/constants';
import { addDays, errorMessage, firstName, fmtDay, fmtTime, kes, nairobiISO, todayISODate, unwrap } from '../../lib/format';

const DURATIONS = [2, 4, 6, 8, 10, 12, 24];

// Earliest sensible slot: the next full hour today, or 8am tomorrow if it's late.
function firstSlot() {
  const h = new Date().getHours();
  if (h >= 20) return { day: addDays(todayISODate(), 1), time: '08:00' };
  return { day: todayISODate(), time: `${String(Math.max(h + 1, 8)).padStart(2, '0')}:00` };
}

const closest = (n) => DURATIONS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), 8);

/**
 * Request a booking with one caregiver (web: RequestBooking.jsx).
 * Params: { caregiver, request?, requestId? } — a care request prefills the form.
 */
export default function BookCaregiverScreen({ route, navigation }) {
  const { caregiver, request: passedRequest, requestId } = route.params;
  const insets = useSafeAreaInsets();
  const [careRequest, setCareRequest] = useState(passedRequest ?? null);

  // Came from Smart Match / applications with only an id → look the request up.
  useEffect(() => {
    if (careRequest || !requestId) return;
    careRequestApi.mine()
      .then(({ data }) => setCareRequest(unwrap(data).find((r) => r.id === requestId) ?? null))
      .catch(() => {});
  }, [requestId, careRequest]);

  const [form, setForm] = useState({
    care_type: 'daycare',
    ...firstSlot(),
    hours: 8,
    address: '',
    special_needs: '',
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Prefill once the care request is known.
  useEffect(() => {
    if (!careRequest) return;
    const futureDay = careRequest.start_date && careRequest.start_date > todayISODate();
    setForm((f) => ({
      ...f,
      care_type: RECIPIENT_TO_CARE_TYPE[careRequest.care_recipient] ?? f.care_type,
      day: futureDay ? careRequest.start_date : f.day,
      time: futureDay ? '08:00' : f.time,
      hours: careRequest.hours_per_day ? closest(careRequest.hours_per_day) : f.hours,
      address: careRequest.address || f.address,
      special_needs: careRequest.special_needs || f.special_needs,
    }));
  }, [careRequest]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const startISO = nairobiISO(form.day, form.time);
  const end = useMemo(() => new Date(new Date(startISO).getTime() + form.hours * 36e5), [startISO, form.hours]);
  const estimate = form.hours * Number(caregiver.hourly_rate || 0);
  const nowHour = form.day === todayISODate() ? `${String(new Date().getHours()).padStart(2, '0')}:00` : null;

  const submit = async () => {
    setError('');
    if (new Date(startISO) <= new Date()) return setError('Pick a start time later than now.');
    if (form.address.trim().length < 5) return setError('Add the address where care will happen — estate, house number, nearest landmark.');
    setSubmitting(true);
    try {
      await bookingApi.create({
        caregiver_id: caregiver.id,
        care_type: form.care_type,
        start_date: startISO,
        end_date: end.toISOString(),
        address: form.address.trim(),
        special_needs: form.special_needs,
        latitude: careRequest?.latitude ?? null,
        longitude: careRequest?.longitude ?? null,
      });
      Alert.alert(
        'Booking request sent',
        `${firstName(caregiver.user?.full_name)} will confirm shortly. You'll get a notification when they respond.`,
        [{ text: 'View my bookings', onPress: () => navigation.navigate('PatientTabs', { screen: 'Bookings' }) }],
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Request a booking" subtitle="The caregiver confirms before anything is charged."
          onBack={() => navigation.goBack()} />

        <View style={s.px}>
          {/* Who */}
          <Card style={s.who}>
            <Avatar uri={caregiver.user?.avatar} name={caregiver.user?.full_name} size={48} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={TYPE.h4} numberOfLines={1}>{caregiver.user?.full_name}</Text>
                <VerifiedBadge verified={caregiver.user?.is_verified} compact />
              </View>
              <Rating value={caregiver.rating_avg} count={caregiver.rating_count} />
            </View>
            <Text style={s.rate}>{kes(caregiver.hourly_rate)}<Text style={TYPE.caption}>/hr</Text></Text>
          </Card>

          {careRequest ? (
            <Notice kind="info" style={{ marginTop: 12 }}>Prefilled from your care request — adjust anything you need.</Notice>
          ) : null}

          <Text style={s.label}>Type of care</Text>
          <View style={s.wrap}>
            {BOOKING_CARE_TYPES.map((t) => (
              <Chip key={t.value} label={t.label} active={form.care_type === t.value} onPress={() => set({ care_type: t.value })} />
            ))}
          </View>

          <Text style={s.label}>Day</Text>
          <DateStrip value={form.day} onChange={(day) => set({ day })} />

          <Text style={s.label}>Start time</Text>
          <TimeChips value={form.time} onChange={(time) => set({ time })} disabledBefore={nowHour} />

          <Text style={s.label}>How long?</Text>
          <View style={s.wrap}>
            {DURATIONS.map((h) => (
              <Chip key={h} label={h === 24 ? '24 hrs' : `${h} hrs`} active={form.hours === h} onPress={() => set({ hours: h })} />
            ))}
          </View>
          <Text style={[TYPE.caption, { marginTop: 8 }]}>
            {fmtDay(startISO)}, {fmtTime(startISO)} → {fmtDay(end)}, {fmtTime(end)}
          </Text>

          <View style={{ marginTop: 20 }}>
            <Input label="Address" placeholder="Estate, house number, nearest landmark"
              value={form.address} onChangeText={(address) => set({ address })} iconName="map-pin" />
            <Input label="Notes for the caregiver" placeholder="Medication times, mobility, dietary needs…"
              value={form.special_needs} onChangeText={(special_needs) => set({ special_needs })} multiline />
          </View>

          {form.hours >= 24 ? (
            <Notice kind="info">Long bookings are billed for the full time between start and end. For daily visits, book each day separately.</Notice>
          ) : null}
          {error ? <Notice style={{ marginTop: 10 }}>{error}</Notice> : null}
        </View>
      </ScrollView>

      {/* ── Summary + submit ── */}
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={TYPE.caption}>Estimated total · {form.hours} hrs</Text>
          <Text style={s.total}>{kes(estimate)}</Text>
        </View>
        <Button title="Send request" iconName="send" onPress={submit} loading={submitting} style={{ flex: 1.2 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  px:    { paddingHorizontal: 20 },
  who:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rate:  { fontSize: 15, fontWeight: '800', color: C.primary },
  label: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 10 },
  wrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bar:   { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
  total: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2 },
});
