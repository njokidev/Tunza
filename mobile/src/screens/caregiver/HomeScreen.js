import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bookingApi, careRequestApi, caregiverApi, locationApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import BookingCard from '../../components/BookingCard';
import JobCard from '../../components/JobCard';
import { Avatar, Button, Card, LoadingScreen, Notice, SectionLabel, StatCard, StatusPill } from '../../components/ui';
import VerificationBanner from '../../components/VerificationBanner';
import { COLORS as C, TYPE } from '../../theme';
import { BOOKING_STATUS } from '../../lib/constants';
import { useAppliedJobs } from '../../lib/applied';
import {
  careTypeLabel, caregiverNet, errorMessage, firstName, fmtTime, greeting, isSameDay, kes, unwrap, withDistance,
} from '../../lib/format';

/**
 * Caregiver dashboard (web: caregiver/Dashboard.jsx).
 *
 * The caregiver journey, top to bottom:
 *   1. Get set up    — verification + profile completeness (bio, specialties, area, availability)
 *   2. Be findable   — "Available for new clients" toggle
 *   3. Get work      — reply to booking requests; apply to open requests near you
 *   4. Do the visit  — start → share location → end (payment released, less 12.5%)
 */
export default function CaregiverHomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const applied = useAppliedJobs();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [tracking, setTracking] = useState(false);
  const locationSub = useRef(null);

  const load = useCallback(async () => {
    const [profile, bookings, open] = await Promise.allSettled([caregiverApi.me(), bookingApi.list(), careRequestApi.open()]);
    if (profile.status === 'rejected') {
      setError(errorMessage(profile.reason));
    } else {
      setError('');
      setData({
        profile: profile.value.data,
        bookings: bookings.status === 'fulfilled' ? unwrap(bookings.value.data) : [],
        open: open.status === 'fulfilled' ? unwrap(open.value.data) : [],
      });
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => () => locationSub.current?.remove(), []);

  const v = useMemo(() => {
    const bookings = data?.bookings ?? [];
    const now = new Date();
    const pending = bookings.filter((b) => b.status === 'pending').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const ongoing = bookings.find((b) => b.status === 'ongoing');
    const today = bookings
      .filter((b) => b.status === 'ongoing' || (b.status === 'accepted' && isSameDay(b.start_date, now)))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const nextUp = bookings
      .filter((b) => b.status === 'accepted' && new Date(b.start_date) > now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
    const monthNet = bookings
      .filter((b) => b.status === 'completed' && new Date(b.end_date).getMonth() === now.getMonth() && new Date(b.end_date).getFullYear() === now.getFullYear())
      .reduce((sum, b) => sum + caregiverNet(b.total_amount), 0);
    const nearby = withDistance(data?.open ?? [], data?.profile)
      .filter(({ r }) => r.job_state === 'open' && r.can_apply !== false && !r.has_applied && !applied.has(r.id)).slice(0, 2);
    return { pending, ongoing, today, nextUp, monthNet, nearby };
  }, [data, applied]);

  if (!data) {
    return error ? (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: insets.top + 20 }}>
        <Notice>{error}</Notice>
        <Button title="Try again" style={{ marginTop: 12 }} onPress={load} />
      </View>
    ) : <LoadingScreen />;
  }

  const p = data.profile;
  const missing = [
    !p.bio && 'a short bio',
    !p.specializations?.length && 'your specialties',
    !(p.work_areas?.length || p.location_name) && 'the areas you work in',
    !p.availability?.length && 'weekly availability',
    !Number(p.hourly_rate) && 'your hourly rate',
  ].filter(Boolean);
  const vStatus = user?.is_verified ? 'approved' : (p.verification_status || 'not_submitted');
  const steps = [
    { done: user?.is_verified, label: vStatus === 'pending' ? 'Background check in progress (2–3 days)' : 'Background check passed' },
    { done: missing.length === 0, label: 'Profile complete' },
    { done: p.is_available, label: 'Taking new clients' },
  ];
  const setupDone = steps.every((s) => s.done);

  const toggleAvailability = async (val) => {
    setSavingAvail(true);
    try {
      await caregiverApi.updateMe({ is_available: val });
      setData((d) => ({ ...d, profile: { ...d.profile, is_available: val } }));
    } catch (e) {
      Alert.alert('Could not update availability', errorMessage(e));
    } finally {
      setSavingAvail(false);
    }
  };

  const replaceBooking = (updated) => {
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)) }));
    if (updated.status !== 'ongoing' && tracking) stopTracking();
  };

  const startTracking = async (bookingId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location needed', 'Allow location so the family can see you are on the way.');
      return;
    }
    setTracking(true);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      ({ coords }) => {
        locationApi.update({ booking_id: bookingId, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }).catch(() => {});
      },
    );
  };
  const stopTracking = () => { locationSub.current?.remove(); locationSub.current = null; setTracking(false); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 32, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
    >
      {/* ── Greeting ── */}
      <View style={s.greetRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetSmall}>{greeting()},</Text>
          <Text style={s.greet}>{firstName(user?.full_name)} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Avatar uri={user?.avatar} name={user?.full_name} size={44} />
        </TouchableOpacity>
      </View>

      {/* ── Background check in progress ── */}
      <VerificationBanner onPressProfile={() => navigation.navigate('Profile')} />

      {/* ── Availability toggle ── */}
      <Card style={[s.availCard, p.is_available && { borderColor: '#A7F3D0', backgroundColor: C.successLight }]}>
        <View style={[s.dot, { backgroundColor: p.is_available ? C.success : C.textFaint }]} />
        <View style={{ flex: 1 }}>
          <Text style={TYPE.h4}>{p.is_available ? 'Available for new clients' : 'Not taking clients'}</Text>
          <Text style={TYPE.caption}>{!user?.is_verified ? "You'll show to families once you're approved." : p.is_available ? 'Families can find and book you.' : "You won't appear in Smart Match or Browse."}</Text>
        </View>
        <Switch value={!!p.is_available} onValueChange={toggleAvailability} disabled={savingAvail}
          trackColor={{ true: C.success, false: C.border }} thumbColor="#fff" />
      </Card>

      {/* ── Getting set up (new caregivers) ── */}
      {!setupDone ? (
        <Card style={s.setup}>
          <Text style={TYPE.h4}>Get ready for your first booking</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {steps.map((st) => (
              <View key={st.label} style={s.stepRow}>
                <Feather name={st.done ? 'check-circle' : 'circle'} size={17} color={st.done ? C.success : C.textFaint} />
                <Text style={[TYPE.body, { color: st.done ? C.textMuted : C.text }, st.done && { textDecorationLine: 'line-through' }]}>{st.label}</Text>
              </View>
            ))}
          </View>
          {vStatus === 'not_submitted' || vStatus === 'rejected' ? (
            <Text style={[TYPE.caption, { marginTop: 10 }]}>
              {vStatus === 'rejected'
                ? 'Your last application needs changes. Open it to see why and upload again.'
                : "Families can't find you until Tunza runs your background check. Upload your ID, Certificate of Good Conduct and CNA certificate to start."}
            </Text>
          ) : null}
          {missing.length ? (
            <Text style={[TYPE.caption, { marginTop: 6 }]}>Add {missing.join(', ')} — specialty and availability make up 55% of the match score.</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {vStatus === 'not_submitted' || vStatus === 'rejected' ? (
              <Button title={vStatus === 'rejected' ? 'Fix my application' : 'Upload documents'} size="sm" iconName="upload-cloud"
                onPress={() => navigation.navigate('Verification')} />
            ) : null}
            {missing.length ? (
              <Button title="Complete my profile" size="sm" iconName="user-check" variant={vStatus === 'not_submitted' ? 'secondary' : 'primary'}
                onPress={() => navigation.navigate('Profile')} />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* ── Visit in progress ── */}
      {v.ongoing ? (
        <View style={{ marginTop: 18 }}>
          <SectionLabel label="Visit in progress" />
          <Card style={[s.liveCard, tracking && { borderColor: '#A7F3D0' }]}>
            <View style={s.liveTop}>
              <View style={[s.dot, { backgroundColor: C.success }]} />
              <Text style={[TYPE.h4, { flex: 1 }]}>{v.ongoing.patient?.full_name}</Text>
              <Text style={TYPE.caption}>since {fmtTime(v.ongoing.start_date)}</Text>
            </View>
            <Button
              title={tracking ? 'Stop sharing location' : 'Share my location with the family'}
              iconName={tracking ? 'pause' : 'navigation'} size="sm"
              variant={tracking ? 'outline' : 'secondary'}
              onPress={() => (tracking ? stopTracking() : startTracking(v.ongoing.id))}
              style={{ marginTop: 12 }}
            />
          </Card>
          <BookingCard booking={v.ongoing} role="caregiver" onChange={replaceBooking} navigation={navigation} compact />
        </View>
      ) : null}

      {/* ── Stats ── */}
      <View style={s.stats}>
        <StatCard iconName="bell" tone="amber" label="New requests" value={v.pending.length}
          onPress={() => navigation.navigate('Bookings')} />
        <StatCard iconName="clock" tone="sky" label="Today" value={v.today.length}
          onPress={() => navigation.navigate('Bookings')} />
        <StatCard iconName="credit-card" tone="green" label="This month" value={kes(v.monthNet)}
          onPress={() => navigation.navigate('Earnings')} />
      </View>

      {error ? <Notice style={{ marginTop: 12 }}>{error}</Notice> : null}

      {/* ── Booking requests to answer ── */}
      <View style={{ marginTop: 22 }}>
        <SectionLabel label="New booking requests" action={v.pending.length ? 'All bookings' : undefined} onAction={() => navigation.navigate('Bookings')} />
        {v.pending.length === 0 ? (
          <Card><Text style={TYPE.body}>No new requests. Keep your availability on so families can book you.</Text></Card>
        ) : v.pending.slice(0, 3).map((b) => (
          <BookingCard key={b.id} booking={b} role="caregiver" onChange={replaceBooking} navigation={navigation} />
        ))}
      </View>

      {/* ── Today ── */}
      <View style={{ marginTop: 22 }}>
        <SectionLabel label="Today's schedule" />
        <Card noPad>
          {v.today.length === 0 ? (
            <Text style={[TYPE.body, { padding: 16 }]}>
              Nothing scheduled for today.{v.nextUp ? ` Next visit: ${v.nextUp.patient?.full_name}, ${new Date(v.nextUp.start_date).toDateString().slice(0, 10)} at ${fmtTime(v.nextUp.start_date)}.` : ''}
            </Text>
          ) : v.today.map((b, i) => (
            <TouchableOpacity key={b.id} activeOpacity={0.85} onPress={() => navigation.navigate('Bookings')} style={[s.row, i > 0 && s.divider]}>
              <Text style={s.time}>{fmtTime(b.start_date)}</Text>
              <Avatar uri={b.patient?.avatar} name={b.patient?.full_name} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={TYPE.h4} numberOfLines={1}>{b.patient?.full_name}</Text>
                <Text style={TYPE.caption} numberOfLines={1}>{careTypeLabel(b.care_type)}</Text>
              </View>
              <StatusPill map={BOOKING_STATUS} status={b.status} />
            </TouchableOpacity>
          ))}
        </Card>
      </View>

      {/* ── Open requests near you ── */}
      <View style={{ marginTop: 22 }}>
        <SectionLabel label="Open requests near you" action="See all" onAction={() => navigation.navigate('Requests')} />
        {v.nearby.length === 0 ? (
          <Card><Text style={TYPE.body}>No new open requests right now. Families post new ones every day.</Text></Card>
        ) : v.nearby.map(({ r, d, inArea }) => (
          <JobCard key={r.id} request={r} distance={d} inArea={inArea} applied={r.has_applied || applied.has(r.id)}
            onApply={(req) => navigation.navigate('ApplyToRequest', { request: req, defaultRate: p.hourly_rate })} />
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  greetRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  greetSmall: { fontSize: 13, fontWeight: '700', color: C.primary },
  greet:      { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginTop: 2 },
  availCard:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  setup:      { marginTop: 14, backgroundColor: C.primaryXLight, borderColor: C.primaryLight },
  stepRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveCard:   { marginBottom: 10 },
  liveTop:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stats:      { flexDirection: 'row', gap: 10, marginTop: 18 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  divider:    { borderTopWidth: 1, borderTopColor: C.borderLight },
  time:       { width: 62, fontSize: 13, fontWeight: '800', color: C.primary },
});
