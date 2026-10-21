import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bookingApi } from '../api';
import BookingCard from '../components/BookingCard';
import { Button, Empty, LoadingScreen, Notice, ScreenHeader, Segmented } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { COLORS as C } from '../theme';
import { errorMessage, unwrap } from '../lib/format';

const GROUPS = {
  pending:  ['pending'],
  upcoming: ['accepted'],
  active:   ['ongoing'],
  past:     ['completed', 'cancelled', 'rejected'],
};

/** Bookings for the signed-in user, grouped like the web app (web: shared/Bookings.jsx). */
export default function BookingsScreen({ navigation }) {
  const { user } = useAuth();
  const role = user?.role;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await bookingApi.list();
      setList(unwrap(data));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = useMemo(() => {
    const out = Object.fromEntries(Object.keys(GROUPS).map((k) => [k, []]));
    for (const b of list) {
      const key = Object.keys(GROUPS).find((k) => GROUPS[k].includes(b.status));
      if (key) out[key].push(b);
    }
    const asc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
    ['pending', 'upcoming', 'active'].forEach((k) => out[k].sort(asc));
    out.past.sort((a, b) => -asc(a, b));
    return out;
  }, [list]);

  const current = tab ?? (['active', 'pending', 'upcoming'].find((k) => grouped[k].length) || 'upcoming');
  const replace = (updated) => setList((l) => l.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));

  const tabs = [
    { value: 'pending',  label: role === 'caregiver' ? 'Requests' : 'Awaiting reply', count: grouped.pending.length },
    { value: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
    { value: 'active',   label: 'In progress', count: grouped.active.length },
    { value: 'past',     label: 'Past', count: 0 },
  ];

  const empty = {
    pending:  role === 'caregiver' ? 'No new requests. Keep your availability on so families can book you.' : 'Requests you send wait here until the caregiver replies.',
    upcoming: 'Confirmed visits will show here.',
    active:   'Visits in progress show here.',
    past:     'Completed and cancelled bookings show here.',
  }[current];

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={grouped[current]}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View>
          <ScreenHeader title="Bookings"
            subtitle={role === 'caregiver' ? 'Accept requests, then start and end each visit here.' : 'Track every visit, from request to review.'} />
          <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <Segmented tabs={tabs} value={current} onChange={setTab} />
          </View>
          {error ? <Notice style={{ marginHorizontal: 20, marginBottom: 12 }}>{error}</Notice> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 20 }}>
          <BookingCard booking={item} role={role} onChange={replace} navigation={navigation} />
        </View>
      )}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="calendar" title="Nothing here yet" subtitle={empty} />
          {role === 'patient' && current !== 'past' ? (
            <Button title="Book a caregiver" iconName="plus" style={{ marginTop: 14 }}
              onPress={() => navigation.navigate('CareNeeds', { path: 'smart_match' })} />
          ) : null}
          {role === 'caregiver' && current === 'pending' ? (
            <Button title="Find open jobs" variant="outline" iconName="briefcase" style={{ marginTop: 14 }}
              onPress={() => navigation.navigate('Requests')} />
          ) : null}
        </View>
      }
    />
  );
}
