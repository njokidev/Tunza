import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { messageApi } from '../../api';
import { Avatar, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationsScreen({ navigation }) {
  const { user }                      = useAuth();
  const [convs,      setConvs]        = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await messageApi.conversations();
      setConvs(data.results || data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000); // poll for new convs
    return () => clearInterval(interval);
  }, []);

  const renderConv = ({ item }) => {
    const other     = item.participants?.find(p => p.id !== user.id);
    const lastMsg   = item.last_message;
    const unread    = item.unread_count || 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Chat', {
          convId:      item.id,
          otherUserId: other?.id,
          otherName:   other?.full_name,
        })}
      >
        <View style={styles.avatarWrap}>
          <Avatar uri={other?.avatar} name={other?.full_name} size={50} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.name, unread > 0 && { fontWeight: '800' }]}>{other?.full_name}</Text>
            {lastMsg && (
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
              </Text>
            )}
          </View>
          <Text
            style={[styles.preview, unread > 0 && { color: COLORS.text, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {lastMsg
              ? (lastMsg.sender?.id === user.id ? 'You: ' : '') + lastMsg.body
              : 'Start a conversation'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={convs}
        keyExtractor={i => i.id}
        renderItem={renderConv}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Empty icon="💬" title="No conversations yet" subtitle="Book a caregiver to start messaging" />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 22, fontWeight: '800', color: COLORS.text },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.card, gap: 14 },
  avatarWrap: { position: 'relative' },
  badge:      { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  info:       { flex: 1 },
  topRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  time:       { fontSize: 12, color: COLORS.muted },
  preview:    { fontSize: 14, color: COLORS.muted },
  sep:        { height: 1, backgroundColor: COLORS.border, marginLeft: 78 },
});