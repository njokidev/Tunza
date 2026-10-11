import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { caregiverApi, bookingApi, locationApi } from '../../api';
import { Card, Badge, Avatar, Button, StatCard, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE, SPACING } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function CaregiverHomeScreen({ navigation }) {
  const { user }                         = useAuth();
  const [profile,    setProfile]         = useState(null);
  const [bookings,   setBookings]        = useState([]);
  const [available,  setAvailable]       = useState(true);
  const [loading,    setLoading]         = useState(true);
  const [refreshing, setRefreshing]      = useState(false);
  const [tracking,   setTracking]        = useState(false);
  const locationSub                      = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        caregiverApi.myProfile(),
        bookingApi.list(),
      ]);
      setProfile(pRes.data);
      setAvailable(pRes.data.is_available);
      setBookings(bRes.data.results || bRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const toggleAvail = async (val) => {
    try {
      await caregiverApi.updateMyProfile({ is_available: val });
      setAvailable(val);
    } catch { Alert.alert('Error', 'Could not update availability.'); }
  };

  const startTracking = async (bookingId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed to share your position with the patient.');
      return;
    }
    setTracking(true);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      async ({ coords }) => {
        try {
          await locationApi.update({
            booking_id: bookingId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        } catch { /* silent */ }
      }
    );
  };

  const stopTracking = () => {
    locationSub.current?.remove();
    setTracking(false);
  };

  const ongoingBooking = bookings.find(b => b.status === 'ongoing');
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const doneCount      = bookings.filter(b => b.status === 'completed').length;

  if (loading) return <LoadingScreen />;

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={bookings.slice(0, 5)}
        keyExtractor={b => b.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            colors={[C.primary]} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <>
            {/* ── Gradient header ── */}
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
              <View style={s.headerTop}>
                <View>
                  <Text style={s.greeting}>Hello, {firstName} 👋</Text>
                  <Text style={s.subGreeting}>Caregiver Dashboard</Text>
                </View>
                <View style={s.availRow}>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
                    {available ? 'Available' : 'Off Duty'}
                  </Text>
                  <Switch
                    value={available}
                    onValueChange={toggleAvail}
                    trackColor={{ true: '#4ADE80', false: 'rgba(255,255,255,0.3)' }}
                    thumbColor="#fff"
                    ios_backgroundColor="rgba(255,255,255,0.3)"
                  />
                </View>
              </View>

              {/* ── Stats row inside header ── */}
              <View style={s.statsRow}>
                <View style={s.statPill}>
                  <Text style={s.statNum}>{profile?.rating_avg || '—'}</Text>
                  <Text style={s.statLbl}>⭐ Rating</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statPill}>
                  <Text style={s.statNum}>{pendingCount}</Text>
                  <Text style={s.statLbl}>📋 Pending</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statPill}>
                  <Text style={s.statNum}>{doneCount}</Text>
                  <Text style={s.statLbl}>✅ Done</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statPill}>
                  <Text style={s.statNum}>{profile?.rating_count || 0}</Text>
                  <Text style={s.statLbl}>📝 Reviews</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={{ padding: 16 }}>
              {/* ── Active session banner ── */}
              {ongoingBooking && (
                <View style={[s.sessionCard, SHADOWS.md]}>
                  <LinearGradient
                    colors={tracking ? ['#059669', '#047857'] : GRADIENT.primary}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.sessionGrad}
                  >
                    <View style={s.sessionDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                        Active Session
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                        Patient: {ongoingBooking.patient?.full_name}
                      </Text>
                    </View>
                  </LinearGradient>
                  <View style={s.sessionActions}>
                    {tracking ? (
                      <Button title="⏹ Stop Sharing Location" variant="outline"
                        onPress={stopTracking} style={{ flex: 1 }} />
                    ) : (
                      <Button title="📍 Share My Location"
                        onPress={() => startTracking(ongoingBooking.id)} style={{ flex: 1 }} />
                    )}
                  </View>
                </View>
              )}

              {/* ── Recent bookings header ── */}
              <View style={s.sectionRow}>
                <Text style={TYPE.h3}>Recent Bookings</Text>
                <Text style={s.seeAll} onPress={() => navigation.navigate('Bookings')}>
                  See all →
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.bookingRow, SHADOWS.card]}>
              <View style={[s.statusBar, {
                backgroundColor:
                  item.status === 'pending'   ? C.warning :
                  item.status === 'ongoing'   ? C.primary :
                  item.status === 'completed' ? C.success : C.border
              }]} />
              <View style={s.bookingBody}>
                <Avatar uri={item.patient?.avatar} name={item.patient?.full_name} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={TYPE.h4}>{item.patient?.full_name}</Text>
                  <Text style={[TYPE.caption, { textTransform: 'capitalize', marginTop: 2 }]}>
                    {item.care_type?.replace('_', ' ')}
                  </Text>
                  <Text style={TYPE.micro}>
                    {format(new Date(item.scheduled_start), 'dd MMM yyyy')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge label={item.status} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>
                    KES {item.final_amount || item.estimated_amount}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 32, marginTop: 8 }}>
            <Button title="View All Bookings" variant="outline"
              onPress={() => navigation.navigate('Bookings')} />
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <Empty icon="📅" title="No bookings yet"
              subtitle="Once patients book you, sessions will appear here" />
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  subGreeting:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  availRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, padding: 14 },
  statPill:     { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLbl:      { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 3, textAlign: 'center' },
  statDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  sessionCard:  { borderRadius: RADIUS.lg, overflow: 'hidden', marginHorizontal: 0, marginBottom: 16 },
  sessionGrad:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  sessionDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', flexShrink: 0 },
  sessionActions:{ padding: 12, backgroundColor: C.card },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll:       { fontSize: 13, fontWeight: '600', color: C.primary },
  bookingRow:   { backgroundColor: C.card, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 10, flexDirection: 'row' },
  statusBar:    { width: 4 },
  bookingBody:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
});
