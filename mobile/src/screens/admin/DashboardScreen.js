import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import api, { authApi } from '../../api';
import { Card, Avatar, Badge, Button, COLORS, LoadingScreen, Empty } from '../../components/ui';

export default function AdminDashboardScreen({ navigation }) {
  const [users,     setUsers]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [tab,       setTab]       = useState('users');
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [uRes, bRes] = await Promise.all([
        authApi.notifications().catch(() => ({ data: [] })), // reuse — we call users directly
        api.get('/bookings/admin/all/'),
      ]);
      const usersRes = await api.get('/auth/users/');
      setUsers(usersRes.data.results || usersRes.data);
      setBookings(bRes.data.results || bRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const verifyUser = async (userId, name) => {
    Alert.alert(`Verify ${name}?`, 'This marks the caregiver as verified on the platform.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            await api.patch(`/auth/users/${userId}/verify/`);
            fetchAll();
          } catch {
            Alert.alert('Error', 'Could not verify user.');
          }
        },
      },
    ]);
  };

  const TABS = ['users', 'bookings'];

  const stats = {
    patients:   users.filter(u => u.role === 'patient').length,
    caregivers: users.filter(u => u.role === 'caregiver').length,
    verified:   users.filter(u => u.is_verified).length,
    pending:    bookings.filter(b => b.status === 'pending').length,
    completed:  bookings.filter(b => b.status === 'completed').length,
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Patients',   value: stats.patients,   icon: '🏥' },
          { label: 'Caregivers', value: stats.caregivers, icon: '👩‍⚕️' },
          { label: 'Verified',   value: stats.verified,   icon: '✅' },
          { label: 'Bookings',   value: bookings.length,  icon: '📅' },
        ].map(s => (
          <Card key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statNumber}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: COLORS.primary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={[COLORS.primary]} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Empty icon="👤" title="No users found" />}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 4 }}>
              <View style={styles.userRow}>
                <Avatar uri={item.avatar} name={item.full_name} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userName}>{item.full_name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={styles.userBadges}>
                  <Badge label={item.role} />
                  {item.is_verified && <Badge label="verified" />}
                </View>
              </View>
              {item.role === 'caregiver' && !item.is_verified && (
                <Button
                  title="✅ Verify Caregiver"
                  onPress={() => verifyUser(item.id, item.full_name)}
                  style={styles.verifyBtn}
                />
              )}
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={[COLORS.primary]} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Empty icon="📅" title="No bookings" />}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 4 }}>
              <View style={styles.bookingHeader}>
                <Text style={styles.userName}>{item.patient?.full_name}</Text>
                <Badge label={item.status} />
              </View>
              <Text style={styles.userEmail}>
                → {item.caregiver?.user?.full_name} · {item.care_type}
              </Text>
              <View style={styles.bookingFooter}>
                <Text style={styles.amount}>KES {item.total_amount}</Text>
                <Badge label={item.is_paid ? 'Paid' : 'Unpaid'} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  header:        { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:         { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard:      { width: '47%', alignItems: 'center', paddingVertical: 14, margin: 0 },
  statIcon:      { fontSize: 24, marginBottom: 4 },
  statNumber:    { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel:     { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  tabRow:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText:       { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  userRow:       { flexDirection: 'row', alignItems: 'center' },
  userName:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  userEmail:     { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  userBadges:    { gap: 4, alignItems: 'flex-end' },
  verifyBtn:     { marginTop: 12, paddingVertical: 9 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  amount:        { fontSize: 16, fontWeight: '700', color: COLORS.primary },
});
