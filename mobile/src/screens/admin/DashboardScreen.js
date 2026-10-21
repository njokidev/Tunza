import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api, { authApi } from '../../api';
import { Avatar, Badge, Button, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';

export default function AdminDashboardScreen({ navigation }) {
  const [users,      setUsers]      = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [server,     setServer]     = useState(null);   // totals from /auth/admin/stats/
  const [tab,        setTab]        = useState('users');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [uRes, bRes, sRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/bookings/admin/all/'),
        api.get('/auth/admin/stats/'),
      ]);
      setUsers(uRes.data.results   || uRes.data);
      setBookings(bRes.data.results || bRes.data);
      setServer(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const verifyUser = (userId, name) => {
    Alert.alert(`Verify ${name}?`, 'This caregiver will appear in patient search results.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify ✅', onPress: async () => {
        try { await authApi.verifyUser(userId); fetchAll(); }
        catch { Alert.alert('Error', 'Could not verify user.'); }
      }},
    ]);
  };

  // Totals come from the server so they count every record, not just the first page of the lists
  const stats = {
    patients:   server?.users.patients ?? 0,
    caregivers: server?.users.caregivers ?? 0,
    verified:   server?.users.caregivers_verified ?? 0,
    bookings:   server?.bookings.total ?? 0,
    pending:    server?.bookings.by_status.pending ?? 0,
    completed:  server?.bookings.by_status.completed ?? 0,
    revenue:    Number(server?.money.gmv ?? 0),
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      <FlatList
        data={tab === 'users' ? users : bookings}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            colors={[C.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* ── Header ── */}
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
              <Text style={s.headerTitle}>Admin Dashboard</Text>
              <Text style={s.headerSub}>Tunza platform overview</Text>

              {/* Stats grid */}
              <View style={s.statsGrid}>
                {[
                  { icon:'🏥', val: stats.patients,   lbl:'Patients' },
                  { icon:'👩‍⚕️', val: stats.caregivers, lbl:'Caregivers' },
                  { icon:'✅', val: stats.verified,   lbl:'Verified carers' },
                  { icon:'📅', val: stats.bookings,  lbl:'Bookings' },
                  { icon:'✔', val: stats.completed,   lbl:'Completed' },
                  { icon:'💰', val:`${stats.revenue.toLocaleString()}`, lbl:'KES Paid' },
                ].map((st, i) => (
                  <View key={i} style={s.statCard}>
                    <Text style={s.statIcon}>{st.icon}</Text>
                    <Text style={s.statVal}>{st.val}</Text>
                    <Text style={s.statLbl}>{st.lbl}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* ── Tabs ── */}
            <View style={s.tabBar}>
              {['users', 'bookings'].map(t => (
                <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]}
                  onPress={() => setTab(t)}>
                  <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                    {t === 'users' ? `Users (${stats.patients + stats.caregivers})` : `Bookings (${stats.bookings})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => tab === 'users' ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.userCard, SHADOWS.card]}>
              <Avatar uri={item.avatar} name={item.full_name} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={TYPE.h4}>{item.full_name}</Text>
                <Text style={[TYPE.caption, { marginTop: 2 }]}>{item.email}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <Badge label={item.role} />
                  {item.is_verified && <Badge label="verified" />}
                </View>
              </View>
              {item.role === 'caregiver' && !item.is_verified && (
                <Button title="Verify" onPress={() => verifyUser(item.id, item.full_name)}
                  style={{ paddingVertical: 8, paddingHorizontal: 12 }} />
              )}
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.userCard, SHADOWS.card]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={TYPE.h4}>{item.patient?.full_name}</Text>
                  <Badge label={item.status} />
                </View>
                <Text style={TYPE.caption}>→ {item.caregiver?.user?.full_name} · {item.care_type}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: C.primary }}>
                    KES {Number(item.total_amount || 0).toLocaleString()}
                  </Text>
                  <Badge label={item.is_paid ? 'Paid' : 'Unpaid'} />
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <Empty icon={tab === 'users' ? '👤' : '📅'}
              title={`No ${tab} found`} />
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 16 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 20 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:     { width: '30%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  statIcon:     { fontSize: 20, marginBottom: 4 },
  statVal:      { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLbl:      { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' },
  tabBar:       { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn:       { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: C.primary },
  tabTxt:       { fontSize: 14, fontWeight: '600', color: C.textMuted },
  tabTxtActive: { color: C.primary },
  userCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10 },
});
