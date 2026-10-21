import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { careRequestApi } from '../../api';
import { Button, Card, Empty, LoadingScreen, Notice, ScreenHeader, StatusPill } from '../../components/ui';
import { COLORS as C, RADIUS, TYPE } from '../../theme';
import { REQUEST_STATUS, SCHEDULE_TYPES } from '../../lib/constants';
import { errorMessage, fmtDate, recipientLabel, unwrap } from '../../lib/format';

/** Every care request the patient has made (web: MyRequests.jsx). */
export default function MyRequestsScreen({ navigation }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await careRequestApi.mine();
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

  if (loading) return <LoadingScreen />;

  const open = (r) => navigation.navigate(r.discovery_path === 'open_request' ? 'Applications' : 'MatchResults', { requestId: r.id, request: r });

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={list}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View>
          <ScreenHeader onBack={() => navigation.goBack()} title="My care requests"
            subtitle="Smart Match results and open requests you've posted."
            right={<Button title="New" size="sm" iconName="plus" onPress={() => navigation.navigate('CareNeeds')} />} />
          {error ? <Notice style={{ marginHorizontal: 20, marginBottom: 12 }}>{error}</Notice> : null}
        </View>
      }
      renderItem={({ item: r }) => {
        const isOpen = r.discovery_path === 'open_request';
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <Card onPress={() => open(r)} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={s.icon}><Feather name={isOpen ? 'radio' : 'zap'} size={17} color={C.primary} /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[TYPE.h4, { flexShrink: 1 }]} numberOfLines={1}>{recipientLabel(r.care_recipient)}</Text>
                    <StatusPill map={REQUEST_STATUS} status={r.status} />
                  </View>
                  <Text style={TYPE.caption}>
                    {isOpen ? 'Open request' : 'Smart Match'} · {SCHEDULE_TYPES.find((t) => t.value === r.schedule_type)?.label} from {fmtDate(r.start_date)}
                  </Text>
                  {r.location_name ? <Text style={TYPE.caption}>{r.location_name}</Text> : null}
                  {r.care_types?.length ? (
                    <View style={s.tags}>
                      {r.care_types.slice(0, 3).map((t) => <View key={t} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>)}
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={s.footer}>
                <Text style={s.link}>{isOpen ? 'See applicants' : 'See matches'}</Text>
                <Feather name="chevron-right" size={16} color={C.primary} />
              </View>
            </Card>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="clipboard" title="No care requests yet"
            subtitle="Tell us what you need and we'll find caregivers who fit."
            action="Start Smart Match" onAction={() => navigation.navigate('CareNeeds', { path: 'smart_match' })} />
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  icon:   { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  tags:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag:    { backgroundColor: C.primaryXLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill },
  tagTxt: { fontSize: 11, fontWeight: '700', color: C.primary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderLight },
  link:   { fontSize: 13, fontWeight: '700', color: C.primary },
});
