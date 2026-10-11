import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { paymentApi } from '../../api';
import { Card, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';
import { format } from 'date-fns';

export default function EarningsScreen() {
  const [wallet,     setWallet]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await paymentApi.myWallet();
      setWallet(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={t => t.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            colors={[C.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* ── Wallet hero ── */}
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
              <Text style={s.headerLabel}>My Wallet</Text>
              <Text style={s.balance}>KES {wallet?.balance?.toLocaleString() || '0'}</Text>
              <Text style={s.balanceSub}>Available Balance</Text>

              <View style={s.totalRow}>
                <View style={s.totalPill}>
                  <Text style={s.totalNum}>KES {wallet?.total_earned?.toLocaleString() || '0'}</Text>
                  <Text style={s.totalLbl}>Total Earned</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.totalPill}>
                  <Text style={s.totalNum}>{wallet?.transactions?.length || 0}</Text>
                  <Text style={s.totalLbl}>Sessions Paid</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={{ padding: 16 }}>
              <Text style={[TYPE.h3, { marginBottom: 12 }]}>Transaction History</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.txRow, SHADOWS.card]}>
              <View style={[s.txIcon, { backgroundColor: item.type === 'credit' ? C.successLight : C.dangerLight }]}>
                <Text style={{ fontSize: 20 }}>{item.type === 'credit' ? '💰' : '📤'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={TYPE.h4}>
                  {item.type === 'credit' ? 'Payment Received' : 'Withdrawal'}
                </Text>
                <Text style={[TYPE.micro, { marginTop: 3 }]}>
                  {format(new Date(item.created_at), 'dd MMM yyyy · HH:mm')}
                </Text>
                {item.note ? (
                  <Text style={[TYPE.caption, { marginTop: 2 }]} numberOfLines={1}>{item.note}</Text>
                ) : null}
              </View>
              <Text style={[s.txAmount, { color: item.type === 'credit' ? C.success : C.danger }]}>
                {item.type === 'credit' ? '+' : '-'}KES {item.amount}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <Empty icon="💸" title="No transactions yet"
              subtitle="Once patients confirm payment, your earnings will appear here" />
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' },
  headerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  balance:     { fontSize: 44, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceSub:  { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, marginBottom: 24 },
  totalRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, padding: 16, width: '100%' },
  totalPill:   { flex: 1, alignItems: 'center' },
  totalNum:    { fontSize: 18, fontWeight: '800', color: '#fff' },
  totalLbl:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  totalDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  txRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10 },
  txIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txAmount:    { fontSize: 15, fontWeight: '800' },
});
