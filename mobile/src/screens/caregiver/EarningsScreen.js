import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { paymentApi } from '../../api';
import { Card, LoadingScreen, Notice, ScreenHeader, Segmented, StatCard } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, TYPE } from '../../theme';
import { errorMessage, fmtDate, fmtPhone, fmtTime, kes } from '../../lib/format';

/**
 * Wallet (web: shared/Wallet.jsx, caregiver view). Worked out on the server:
 * available to pay out, on hold for a day after each visit, upcoming, and
 * everything Tunza has sent by M-Pesa. Amounts are after the 12.5% fee.
 */
export default function EarningsScreen({ navigation }) {
  const [w, setW] = useState(null);
  const [tab, setTab] = useState('available');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await paymentApi.wallet();
      setW(data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!w && !error) return <LoadingScreen />;

  const rows = !w ? [] : tab === 'available' ? w.available_visits : tab === 'hold' ? w.on_hold_visits : w.payouts;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}>
      <ScreenHeader title="Wallet" subtitle="Your earnings after Tunza's 12.5% fee."
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <View style={{ paddingHorizontal: 20 }}>
        {error ? <Notice style={{ marginBottom: 12 }}>{error}</Notice> : null}
        {w ? (
          <>
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
              <View style={st.glow} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="credit-card" size={14} color="#D6C0F0" />
                <Text style={st.heroLbl}>Available for payout</Text>
              </View>
              <Text style={st.heroAmt}>{kes(w.available)}</Text>
              <Text style={st.heroSub}>
                {w.payout_number ? `Paid to M-Pesa ${fmtPhone(w.payout_number)}` : 'Add an M-Pesa payout number on your profile'}
              </Text>
            </LinearGradient>

            <View style={st.stats}>
              <StatCard iconName="lock" tone="amber" label="On hold" value={kes(w.on_hold)} sub={`for ${w.hold_hours} h after a visit`} />
              <StatCard iconName="clock" tone="sky" label="Upcoming" value={kes(w.upcoming)} sub={`${w.upcoming_count} confirmed visit${w.upcoming_count === 1 ? '' : 's'}`} />
            </View>
            <View style={[st.stats, { marginTop: 10 }]}>
              <StatCard iconName="calendar" tone="green" label="This month" value={kes(w.this_month)} />
              <StatCard iconName="send" tone="brand" label="Paid out" value={kes(w.paid_out)} sub="all time" />
            </View>

            <Notice kind="info" style={{ marginTop: 14 }}>
              {`Earnings stay on hold for ${w.hold_hours} hours after a visit in case the family raises a problem, then become available. Tunza sends available money to your M-Pesa.`}
            </Notice>

            <Segmented value={tab} onChange={setTab} style={{ marginTop: 18 }}
              tabs={[
                { value: 'available', label: 'Available', count: w.available_visits.length },
                { value: 'hold', label: 'On hold', count: w.on_hold_visits.length },
                { value: 'payouts', label: 'Payouts', count: w.payouts.length },
              ]} />

            <View style={{ marginTop: 12 }}>
              {rows.length === 0 ? (
                <Card><Text style={TYPE.body}>
                  {tab === 'payouts' ? 'No payouts yet.' : tab === 'hold' ? 'Nothing on hold right now.' : 'Nothing waiting to be paid out.'}
                </Text></Card>
              ) : tab === 'payouts' ? rows.map((p) => (
                <Card key={p.id} style={st.row}>
                  <View style={[st.icon, { backgroundColor: C.primaryXLight }]}><Feather name="send" size={17} color={C.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={TYPE.h4}>M-Pesa {p.mpesa_reference}</Text>
                    <Text style={TYPE.caption}>{fmtDate(p.created_at)} · {p.visits} visit{p.visits === 1 ? '' : 's'} · to {fmtPhone(p.phone)}</Text>
                  </View>
                  <Text style={[st.amt, { color: C.primary }]}>{kes(p.amount)}</Text>
                </Card>
              )) : rows.map((v) => (
                <Card key={v.booking_id} style={st.row}>
                  <View style={st.icon}><Feather name={tab === 'hold' ? 'lock' : 'arrow-down-left'} size={17} color={tab === 'hold' ? C.warning : C.success} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={TYPE.h4} numberOfLines={1}>Visit for {v.family}</Text>
                    <Text style={TYPE.caption}>
                      {fmtDate(v.date)}{tab === 'hold' && v.available_at ? ` · available ${fmtDate(v.available_at)}, ${fmtTime(v.available_at)}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.amt}>+{kes(v.net)}</Text>
                    <Text style={TYPE.micro}>of {kes(v.gross)}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
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
