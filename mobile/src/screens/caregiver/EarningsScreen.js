import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { bookingApi } from '../../api';
import { Card, Empty, LoadingScreen, Notice, ScreenHeader, StatCard } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, TYPE } from '../../theme';
import { careTypeLabel, caregiverNet, errorMessage, fmtDate, kes, platformFee, unwrap } from '../../lib/format';

const sum = (list, f) => list.reduce((acc, b) => acc + f(b), 0);

/**
 * Earnings, computed from completed bookings (web: shared/Wallet.jsx, caregiver view).
 * Ending a visit marks it paid; Tunza keeps 12.5%.
 */
export default function EarningsScreen({ navigation }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const s = useMemo(() => {
    const completed = list.filter((b) => b.status === 'completed').sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    const committed = list.filter((b) => ['accepted', 'ongoing'].includes(b.status));
    const now = new Date();
    const thisMonth = completed.filter((b) => {
      const d = new Date(b.end_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      completed,
      net: sum(completed, (b) => caregiverNet(b.total_amount)),
      fees: sum(completed, (b) => platformFee(b.total_amount)),
      committedNet: sum(committed, (b) => caregiverNet(b.total_amount)),
      monthNet: sum(thisMonth, (b) => caregiverNet(b.total_amount)),
    };
  }, [list]);

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={s.completed}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ marginHorizontal: -20 }}>
            <ScreenHeader title="Earnings" subtitle="What you've earned on Tunza, after the 12.5% platform fee."
              onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
          </View>
          {error ? <Notice style={{ marginBottom: 12 }}>{error}</Notice> : null}
          <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
            <View style={st.glow} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="credit-card" size={14} color="#D6C0F0" />
              <Text style={st.heroLbl}>Total earned</Text>
            </View>
            <Text style={st.heroAmt}>{kes(s.net)}</Text>
            <Text style={st.heroSub}>{s.completed.length} completed visit{s.completed.length === 1 ? '' : 's'}</Text>
          </LinearGradient>
          <View style={st.stats}>
            <StatCard iconName="calendar" tone="green" label="This month" value={kes(s.monthNet)} />
            <StatCard iconName="clock" tone="sky" label="Upcoming" value={kes(s.committedNet)} sub="confirmed visits" />
          </View>
          <View style={[st.stats, { marginTop: 10 }]}>
            <StatCard iconName="percent" tone="amber" label="Platform fees" value={kes(s.fees)} sub="12.5% per visit" />
          </View>
          <Text style={[TYPE.h3, { marginTop: 22, marginBottom: 10 }]}>Completed visits</Text>
        </View>
      }
      renderItem={({ item: b }) => (
        <View style={{ paddingHorizontal: 20 }}>
          <Card style={st.row}>
            <View style={st.icon}><Feather name="arrow-down-left" size={18} color={C.success} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={TYPE.h4} numberOfLines={1}>{b.patient?.full_name}</Text>
              <Text style={TYPE.caption}>{careTypeLabel(b.care_type)} · {fmtDate(b.end_date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.amt}>+{kes(caregiverNet(b.total_amount))}</Text>
              <Text style={TYPE.micro}>of {kes(b.total_amount)}</Text>
            </View>
          </Card>
        </View>
      )}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 20 }}>
          <Empty iconName="credit-card" title="No earnings yet" subtitle="When you end a visit, the payment shows up here." />
        </View>
      }
    />
  );
}

const st = StyleSheet.create({
  hero:    { borderRadius: RADIUS.xl, padding: 22, overflow: 'hidden' },
  glow:    { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroLbl: { fontSize: 13, fontWeight: '700', color: '#D6C0F0' },
  heroAmt: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 8, letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: '#D6C0F0', marginTop: 4 },
  stats:   { flexDirection: 'row', gap: 10, marginTop: 14 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.successLight, alignItems: 'center', justifyContent: 'center' },
  amt:     { fontSize: 15, fontWeight: '800', color: C.success },
});
