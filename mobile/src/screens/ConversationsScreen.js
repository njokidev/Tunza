import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { messageApi } from '../api';
import { Avatar, Empty, LoadingScreen, ScreenHeader } from '../components/ui';
import { COLORS as C, TYPE } from '../theme';
import { useAuth } from '../context/AuthContext';
import usePolling from '../lib/usePolling';
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

  // Refresh the inbox every 30s, only while this tab is visible.
  usePolling(fetch, 30000, [fetch]);

  if (loading) return <LoadingScreen />;

  const renderConv = ({ item }) => {
    const other   = item.participants?.find(p => p.id !== user.id);
    const lastMsg = item.last_message;
    const unread  = item.unread_count || 0;

    return (
      <TouchableOpacity activeOpacity={0.92}
        style={s.row}
        onPress={() => navigation.navigate('Chat', {
          convId: item.id, otherUserId: other?.id, otherName: other?.full_name,
        })}>
        <View style={{ position: 'relative' }}>
          <Avatar uri={other?.avatar} name={other?.full_name} size={52} />
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
        <View style={s.info}>
          <View style={s.topRow}>
            <Text style={[s.name, unread > 0 && { fontWeight: '800' }]}>{other?.full_name}</Text>
            {lastMsg && (
              <Text style={TYPE.micro}>
                {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
              </Text>
            )}
          </View>
          <Text style={[s.preview, unread > 0 && { color: C.text, fontWeight: '600' }]} numberOfLines={1}>
            {lastMsg
              ? (lastMsg.sender?.id === user.id ? 'You: ' : '') + lastMsg.body
              : 'Start the conversation'}
          </Text>
        </View>
        {unread > 0 && <View style={s.activeDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title="Messages"
        subtitle={convs.length ? `${convs.length} conversation${convs.length !== 1 ? 's' : ''}` : 'Chat with families and caregivers.'} />

      <FlatList
        data={convs}
        keyExtractor={i => i.id}
        renderItem={renderConv}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            colors={[C.primary]} tintColor={C.primary} />
        }
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20 }}>
            <Empty iconName="message-circle" title="No conversations yet"
              subtitle={user.role === 'patient' ? 'Message a caregiver from their profile to ask questions before booking.' : 'Messages from families will appear here.'} />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: C.card, gap: 14 },
  badge:       { position: 'absolute', top: -2, right: -2, backgroundColor: C.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.card },
  badgeTxt:    { color: '#fff', fontSize: 9, fontWeight: '800' },
  info:        { flex: 1 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:        { fontSize: 15, fontWeight: '700', color: C.text },
  preview:     { fontSize: 13, color: C.textMuted },
  activeDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, flexShrink: 0 },
  sep:         { height: 1, backgroundColor: C.borderLight, marginLeft: 86 },
});
