import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { careRequestApi, caregiverApi } from '../../api';
import JobCard from '../../components/JobCard';
import { Empty, LoadingScreen, Notice, ScreenHeader, Segmented } from '../../components/ui';
import { COLORS as C, TYPE } from '../../theme';
import { useAppliedJobs } from '../../lib/applied';
import { errorMessage, unwrap, withDistance } from '../../lib/format';

const isOpen = (r) => (r.job_state || 'open') === 'open';

/**
 * Open requests families have posted (web: caregiver/OpenJobs.jsx).
 * Open jobs first — in your areas, then nearest. Jobs that were taken or whose
 * start date passed in the last 2 days are shown below, greyed out.
 */
export default function OpenRequestsScreen({ navigation }) {
  const applied = useAppliedJobs();
  const [data, setData] = useState({ requests: [], profile: null });
  const [filter, setFilter] = useState('all');
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

  const all = useMemo(() => withDistance(data.requests, data.profile), [data]);
  const openCount = all.filter(({ r }) => isOpen(r)).length;
  const closedCount = all.length - openCount;
  const jobs = filter === 'open' ? all.filter(({ r }) => isOpen(r)) : all;
  const firstClosed = jobs.findIndex(({ r }) => !isOpen(r));
  const hasAreas = data.profile?.work_areas?.length || data.profile?.latitude;

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
            subtitle={openCount ? `${openCount} famil${openCount === 1 ? 'y is' : 'ies are'} looking for a caregiver. Jobs in your areas first.` : 'Families post care requests here. Apply with a short message.'} />
          {closedCount ? (
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <Segmented value={filter} onChange={setFilter}
                tabs={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open only', count: openCount }]} />
            </View>
          ) : null}
          {!hasAreas ? (
            <Notice kind="info" style={{ marginHorizontal: 20, marginBottom: 12 }}>
              Add the areas you work in on your profile to see jobs near you first.
            </Notice>
          ) : null}
          {error ? <Notice style={{ marginHorizontal: 20, marginBottom: 12 }}>{error}</Notice> : null}
        </View>
      }
      renderItem={({ item: { r, d, inArea }, index }) => (
        <View style={{ paddingHorizontal: 20 }}>
          {index === firstClosed ? (
            <Text style={[TYPE.label, { color: C.textMuted, marginTop: index ? 8 : 0, marginBottom: 10 }]}>
              No longer available
            </Text>
          ) : null}
          <JobCard request={r} distance={d} inArea={inArea} applied={r.has_applied || applied.has(r.id)}
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
