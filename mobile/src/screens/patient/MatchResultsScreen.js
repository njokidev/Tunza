import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Alert, RefreshControl } from 'react-native';
import { careRequestApi } from '../../api';
import { Button, CaregiverCard, Empty, LoadingScreen, Notice, ScreenHeader } from '../../components/ui';
import { COLORS as C } from '../../theme';
import { errorMessage, fmtDate, recipientLabel, unwrap } from '../../lib/format';

/**
 * Smart Match results (web: Matches.jsx). Params: { requestId, request?, justCreated? }
 * Shortlist to keep track, then "Book" opens the booking form prefilled from the request.
 */
export default function MatchResultsScreen({ route, navigation }) {
  const { requestId, request, justCreated } = route.params;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await careRequestApi.matches(requestId);
      setMatches(unwrap(data).sort((a, b) => Number(b.match_score) - Number(a.match_score)));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  const shortlist = async (m) => {
    setBusy(m.id);
    try {
      await careRequestApi.shortlist(requestId, m.id);
      setMatches((list) => list.map((x) => (x.id === m.id ? { ...x, status: 'shortlisted' } : x)));
    } catch (e) {
      Alert.alert('Could not shortlist', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const book = (m) => navigation.navigate('BookCaregiver', { caregiver: m.caregiver, requestId, request });

  if (loading) return <LoadingScreen message="Ranking caregivers for you…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={matches}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View>
          <ScreenHeader
            onBack={() => navigation.goBack()}
            eyebrow="Smart Match"
            title={matches.length ? `${matches.length} caregiver${matches.length === 1 ? '' : 's'} for you` : 'Your matches'}
            subtitle={request ? `${recipientLabel(request.care_recipient)} · from ${fmtDate(request.start_date)}` : 'Ranked by specialty, schedule, distance and budget.'}
          />
          <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 12 }}>
            {justCreated && matches.length > 0 ? (
              <Notice kind="success">Your care request is saved. Here are the best fits — book one, or shortlist a few to compare.</Notice>
            ) : null}
            {error ? <Notice>{error}</Notice> : null}
          </View>
        </View>
      }
      renderItem={({ item: m, index }) => {
        const shortlisted = m.status === 'shortlisted';
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <CaregiverCard
              item={m.caregiver}
              match={m}
              rank={index + 1}
              onPress={() => navigation.navigate('CaregiverDetail', { caregiver: m.caregiver, requestId, request })}
              onBook={m.status === 'booked' ? undefined : () => book(m)}
              footer={
                <Button
                  title={shortlisted ? 'Saved' : 'Shortlist'}
                  iconName={shortlisted ? 'bookmark' : 'bookmark'}
                  size="sm" variant={shortlisted ? 'secondary' : 'outline'}
                  disabled={shortlisted || m.status === 'booked'} loading={busy === m.id}
                  onPress={() => shortlist(m)}
                />
              }
            />
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="search" title="No matches yet"
            subtitle="No verified caregiver fits these needs right now. Browse everyone, or post an open request so caregivers can apply."
            action="Browse caregivers" onAction={() => navigation.navigate('PatientTabs', { screen: 'Browse' })} />
          <Button title="Post an open request" variant="outline" style={{ marginTop: 12 }}
            onPress={() => navigation.replace('CareNeeds', { path: 'open_request', care_recipient: request?.care_recipient })} />
        </View>
      }
    />
  );
}
