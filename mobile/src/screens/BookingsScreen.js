import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { bookingApi } from '../../api';
import { Card, Badge, Avatar, Button, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function BookingsScreen({ navigation }) {
  const { user }                      = useAuth();
  const [bookings,   setBookings]     = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter,     setFilter]       = useState('all');

  const STATUS_FILTERS = ['all', 'pending', 'accepted', 'ongoing', 'completed', 'cancelled'];

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await bookingApi.list();
      setBookings(data.results || data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, []);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingApi.updateStatus(bookingId, { status: newStatus });
      fetchBookings();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not update status.');
    }
  };

  const confirmAction = (bookingId, action, label) => {
    Alert.alert(`${label}?`, `Are you sure you want to ${label.toLowerCase()} this booking?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: action === 'cancelled' || action === 'rejected' ? 'destructive' : 'default', onPress: () => handleStatusChange(bookingId, action) },
    ]);
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const renderBooking = ({ item }) => {
    const isPatient   = user.role === 'patient';
    const otherPerson = isPatient ? item.caregiver?.user : item.patient;

    return (
      <Card>
        <View style={styles.cardTop}>
          <Avatar uri={otherPerson?.avatar} name={otherPerson?.full_name} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.personName}>{otherPerson?.full_name}</Text>
            <Text style={styles.careType}>{item.care_type?.replace('_', '-')}</Text>
            <Text style={styles.date}>
              📅 {format(new Date(item.start_date), 'dd MMM yyyy')} → {format(new Date(item.end_date), 'dd MMM yyyy')}
            </Text>
          </View>
          <Badge label={item.status} />
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amount}>KES {item.total_amount}</Text>
          <Badge label={item.is_paid ? 'Paid' : 'Unpaid'} />
        </View>

        {/* Action buttons by role + status */}
        <View style={styles.actions}>
          {/* Caregiver actions */}
          {user.role === 'caregiver' && item.status === 'pending' && (
            <>
              <Button title="✅ Accept" onPress={() => handleStatusChange(item.id, 'accepted')} style={styles.actionBtn} />
              <Button title="❌ Reject" variant="outline" onPress={() => confirmAction(item.id, 'rejected', 'Reject')} style={styles.actionBtn} />
            </>
          )}
          {user.role === 'caregiver' && item.status === 'accepted' && (
            <Button title="🚀 Start Care" onPress={() => handleStatusChange(item.id, 'ongoing')} style={styles.actionBtn} />
          )}
          {user.role === 'caregiver' && item.status === 'ongoing' && (
            <Button title="✅ Mark Complete" onPress={() => confirmAction(item.id, 'completed', 'Complete')} style={styles.actionBtn} />
          )}

          {/* Patient actions */}
          {user.role === 'patient' && item.status === 'pending' && (
            <Button title="Cancel" variant="outline" onPress={() => confirmAction(item.id, 'cancelled', 'Cancel')} style={styles.actionBtn} />
          )}
          {user.role === 'patient' && item.status === 'accepted' && !item.is_paid && (
            <Button title="💳 Pay Now (M-Pesa)" onPress={() => navigation.navigate('Payment', { booking: item })} style={styles.actionBtn} />
          )}
          {user.role === 'patient' && item.status === 'ongoing' && (
            <Button title="📍 Track Caregiver" variant="outline" onPress={() => navigation.navigate('TrackCaregiver', { bookingId: item.id })} style={styles.actionBtn} />
          )}
          {user.role === 'patient' && item.status === 'completed' && !item.review && (
            <Button title="⭐ Leave Review" variant="outline" onPress={() => navigation.navigate('Review', { booking: item })} style={styles.actionBtn} />
          )}

          {/* Message always available if booking exists */}
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => navigation.navigate('Chat', {
              otherUserId: isPatient ? item.caregiver?.user?.id : item.patient?.id,
              otherName:   otherPerson?.full_name,
            })}
          >
            <Text style={styles.msgBtnText}>💬 Message</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Status filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, filter === item && styles.chipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.chipText, filter === item && { color: '#fff' }]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Empty icon="📅" title="No bookings" subtitle="Your bookings will appear here" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  header:     { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 22, fontWeight: '800', color: COLORS.text },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  personName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  careType:   { fontSize: 12, color: COLORS.muted, textTransform: 'capitalize', marginTop: 2 },
  date:       { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  amountRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  amount:     { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  actions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn:  { flex: 1, paddingVertical: 10 },
  msgBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:   { fontSize: 12, fontWeight: '600', color: COLORS.muted },
});
