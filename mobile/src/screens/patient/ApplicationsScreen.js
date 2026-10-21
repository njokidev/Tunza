import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { careRequestApi } from '../../api';
import { Button, CaregiverCard, Empty, LoadingScreen, Notice, ScreenHeader, StatusPill } from '../../components/ui';
import { COLORS as C, RADIUS, TYPE } from '../../theme';
import { APPLICATION_STATUS } from '../../lib/constants';
import { errorMessage, fmtDate, kes, recipientLabel, timeAgo, unwrap } from '../../lib/format';

/**
 * Applicants for an open request (web: Applications.jsx). Params: { requestId, request?, justCreated? }
 * Patient reads each pitch, then books the one they like (or declines).
 */
export default function ApplicationsScreen({ route, navigation }) {
  const { requestId, request, justCreated } = route.params;
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await careRequestApi.applications(requestId);
      setApps(unwrap(data));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  const decline = (app) => Alert.alert('Decline application?', `${app.caregiver?.user?.full_name} will be told you went with someone else.`, [
    { text: 'Keep', style: 'cancel' },
    {
      text: 'Decline', style: 'destructive', onPress: async () => {
        setBusy(app.id);
        try {
          await careRequestApi.rejectApp(requestId, app.id);
          setApps((list) => list.map((a) => (a.id === app.id ? { ...a, status: 'rejected' } : a)));
        } catch (e) {
          Alert.alert('Could not decline', errorMessage(e));
        } finally {
          setBusy(null);
        }
      },
    },
  ]);

  if (loading) return <LoadingScreen message="Loading applicants…" />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={apps}
      keyExtractor={(a) => String(a.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View>
          <ScreenHeader
            onBack={() => navigation.goBack()}
            eyebrow="Open request"
            title="Applicants"
            subtitle={request ? `${recipientLabel(request.care_recipient)} · from ${fmtDate(request.start_date)}` : 'Caregivers who want to help.'}
          />
          <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 12 }}>
            {justCreated ? (
              <Notice kind="success">Your request is live. Caregivers nearby can now see it and apply — pull down to refresh.</Notice>
            ) : null}
            {error ? <Notice>{error}</Notice> : null}
          </View>
        </View>
      }
      renderItem={({ item: app }) => {
        const cg = app.caregiver;
        const rejected = app.status === 'rejected';
        return (
          <View style={{ paddingHorizontal: 20, marginBottom: 6 }}>
            <View style={[s.pitch, rejected && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <StatusPill map={APPLICATION_STATUS} status={app.status} />
                <Text style={TYPE.micro}>{timeAgo(app.created_at)}</Text>
              </View>
              {app.proposed_rate ? (
                <Text style={[TYPE.label, { marginTop: 8 }]}>
                  Proposed {kes(app.proposed_rate)}/hr
                  {Number(app.proposed_rate) !== Number(cg?.hourly_rate) ? (
                    <Text style={TYPE.caption}>  · bookings bill their profile rate of {kes(cg?.hourly_rate)}/hr</Text>
                  ) : null}
                </Text>
              ) : null}
              {app.message ? <Text style={[TYPE.body, { marginTop: 6 }]}>“{app.message}”</Text> : null}
            </View>
            <CaregiverCard
              item={cg}
              onPress={() => navigation.navigate('CaregiverDetail', { caregiver: cg, requestId, request })}
              onBook={rejected ? undefined : () => navigation.navigate('BookCaregiver', { caregiver: cg, requestId, request })}
              footer={rejected ? null : (
                <>
                  <TouchableOpacity style={s.iconBtn} accessibilityLabel="Message"
                    onPress={() => navigation.navigate('Chat', { otherUserId: cg?.user?.id, otherName: cg?.user?.full_name })}>
                    <Feather name="message-circle" size={17} color={C.textBody} />
                  </TouchableOpacity>
                  <Button title="Decline" size="sm" variant="ghost" iconName="x" loading={busy === app.id} onPress={() => decline(app)} />
                </>
              )}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="inbox" title="No applications yet"
            subtitle="Caregivers who apply will appear here with their message and proposed rate. Meanwhile you can browse and book directly."
            action="Browse caregivers" onAction={() => navigation.navigate('PatientTabs', { screen: 'Browse' })} />
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  pitch:   { backgroundColor: C.cardSoft, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.borderLight, padding: 14, marginBottom: -6, paddingBottom: 18 },
  iconBtn: { width: 36, height: 36, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
