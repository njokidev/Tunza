import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { careRequestApi, caregiverApi } from '../../api';
import JobCard from '../../components/JobCard';
import { Empty, LoadingScreen, Notice, ScreenHeader } from '../../components/ui';
import { COLORS as C } from '../../theme';
import { useAppliedJobs } from '../../lib/applied';
import { errorMessage, unwrap, withDistance } from '../../lib/format';

/** Open requests families have posted, nearest first (web: caregiver/OpenJobs.jsx). */
export default function OpenRequestsScreen({ navigation }) {
  const applied = useAppliedJobs();
  const [data, setData] = useState({ requests: [], profile: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [reqs, profile] = await Promise.all([careRequestApi.open(), caregiverApi.me().catch(() => ({ data: null }))]);
      setData({ requests: unwrap(reqs.data), profile: profile.data });
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const jobs = useMemo(() => withDistance(data.requests, data.profile), [data]);

  if (loading) return <LoadingScreen message="Loading open requests…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={jobs}
      keyExtractor={({ r }) => String(r.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View>
          <ScreenHeader title="Open jobs"
            subtitle={jobs.length ? `${jobs.length} famil${jobs.length === 1 ? 'y is' : 'ies are'} looking for a caregiver. Nearest first.` : 'Families post care requests here. Apply with a short message.'} />
          {!data.profile?.latitude ? (
            <Notice kind="info" style={{ marginHorizontal: 20, marginBottom: 12 }}>
              Set your area on your profile to see how far each job is.
            </Notice>
          ) : null}
          {error ? <Notice style={{ marginHorizontal: 20, marginBottom: 12 }}>{error}</Notice> : null}
        </View>
      }
      renderItem={({ item: { r, d } }) => (
        <View style={{ paddingHorizontal: 20 }}>
          <JobCard request={r} distance={d} applied={applied.has(r.id)}
            onApply={(req) => navigation.navigate('ApplyToRequest', { request: req, defaultRate: data.profile?.hourly_rate })} />
        </View>
      )}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="briefcase" title="No open requests right now"
            subtitle="Check back soon — families post new requests regularly. Keep your availability on to receive direct bookings too." />
        </View>
      }
    />
  );
}
