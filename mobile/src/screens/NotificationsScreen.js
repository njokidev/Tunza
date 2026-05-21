import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { authApi } from '../api';
import { Card, Badge, COLORS, Empty, LoadingScreen } from '../components/ui';

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await authApi.notifications();
      setItems(data.results || data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 7000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await authApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // no-op
    }
  };

  if (loading) return <LoadingScreen message="Loading notifications..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Empty icon="🔔" title="No notifications yet" subtitle="Booking, message, and payment updates will appear here" />}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => !item.is_read && markRead(item.id)}>
            <Card style={[styles.card, !item.is_read && styles.unreadCard]}>
              <View style={styles.head}>
                <Text style={styles.title}>{item.title}</Text>
                <Badge label={item.type} />
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { marginBottom: 4 },
  unreadCard: { borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 10 },
  body: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  time: { fontSize: 11, color: COLORS.muted, marginTop: 10 },
});
