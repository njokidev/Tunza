import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { caregiverApi, bookingApi, locationApi } from '../../api';
import { Card, Badge, Avatar, Button, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function CaregiverHomeScreen({ navigation }) {
  const { user }                         = useAuth();
  const [profile,    setProfile]         = useState(null);
  const [bookings,   setBookings]        = useState([]);
  const [available,  setAvailable]       = useState(true);
  const [toggling,   setToggling]        = useState(false);
  const [loading,    setLoading]         = useState(true);
  const [refreshing, setRefreshing]      = useState(false);
  const [tracking,   setTracking]        = useState(false);
  const locationSub                      = React.useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, bookingRes] = await Promise.all([
        caregiverApi.myProfile(),
        bookingApi.list(),
      ]);
      setProfile(profileRes.data);
      setAvailable(profileRes.data.is_available);
      setBookings((bookingRes.data.results || bookingRes.data).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // Toggle availability
  const toggleAvailability = async (val) => {
    setToggling(true);
    try {
      await caregiverApi.updateMyProfile({ is_available: val });
      setAvailable(val);
    } catch {
      Alert.alert('Error', 'Could not update availability.');
    } finally {
      setToggling(false);
    }
  };

  // Start broadcasting GPS for active (ongoing) bookings
  const startTracking = async (bookingId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to share your location.');
      return;
    }
    setTracking(true);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      async (loc) => {
        try {
          await locationApi.update({
            booking_id: bookingId,
            latitude:   loc.coords.latitude,
            longitude:  loc.coords.longitude,
            accuracy:   loc.coords.accuracy,
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

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Caregiver Dashboard</Text>
        </View>
        <View style={styles.availRow}>
          <Text style={styles.availLabel}>{available ? 'Available' : 'Unavailable'}</Text>
          <Switch
            value={available}
            onValueChange={toggleAvailability}
            disabled={toggling}
            trackColor={{ true: COLORS.success, false: COLORS.muted }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 0 }}
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statNumber}>{profile?.rating_avg || '—'}</Text>
                <Text style={styles.statLabel}>⭐ Rating</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNumber}>{profile?.rating_count || 0}</Text>
                <Text style={styles.statLabel}>📝 Reviews</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNumber}>{bookings.filter(b => b.status === 'completed').length}</Text>
                <Text style={styles.statLabel}>✅ Done</Text>
              </Card>
            </View>

            {/* Live tracking banner */}
            {ongoingBooking && (
              <Card style={[styles.trackBanner, tracking && styles.trackBannerActive]}>
                <Text style={styles.trackTitle}>📍 Active Care Session</Text>
                <Text style={styles.trackSub}>Patient: {ongoingBooking.patient?.full_name}</Text>
                {tracking ? (
                  <Button title="Stop Sharing Location" variant="outline" onPress={stopTracking} style={{ marginTop: 10 }} />
                ) : (
                  <Button title="Share My Location" onPress={() => startTracking(ongoingBooking.id)} style={{ marginTop: 10 }} />
                )}
              </Card>
            )}

            <Text style={styles.sectionTitle}>Recent Bookings</Text>
          </>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 4 }}>
            <View style={styles.bookingRow}>
              <Avatar uri={item.patient?.avatar} name={item.patient?.full_name} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bName}>{item.patient?.full_name}</Text>
                <Text style={styles.bSub}>{item.care_type} · {new Date(item.start_date).toLocaleDateString()}</Text>
              </View>
              <Badge label={item.status} />
            </View>
          </Card>
        )}
        ListEmptyComponent={<Empty icon="📅" title="No bookings yet" subtitle="Once patients book you, they'll appear here" />}
        ListFooterComponent={
          <Button
            title="View All Bookings"
            variant="outline"
            onPress={() => navigation.navigate('Bookings')}
            style={{ marginTop: 8 }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting:         { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subGreeting:      { fontSize: 13, color: COLORS.muted },
  availRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availLabel:       { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  statsRow:         { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:         { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNumber:       { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel:        { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  trackBanner:      { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: 16 },
  trackBannerActive:{ backgroundColor: '#D1FAE5', borderColor: COLORS.success },
  trackTitle:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  trackSub:         { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle:     { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  bookingRow:       { flexDirection: 'row', alignItems: 'center' },
  bName:            { fontSize: 15, fontWeight: '700', color: COLORS.text },
  bSub:             { fontSize: 12, color: COLORS.muted, textTransform: 'capitalize', marginTop: 2 },
});
