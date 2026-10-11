import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { messageApi } from '../api';
import { Avatar, COLORS } from '../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../theme';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
  const { otherUserId, otherName, convId: existingConvId } = route.params;
  const { user }                 = useAuth();
  const [convId,   setConvId]   = useState(existingConvId || null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const listRef                 = useRef(null);
  const pollRef                 = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: otherName || 'Chat' });
  }, [otherName]);

  useEffect(() => {
    (async () => {
      try {
        let id = convId;
        if (!id) {
          const { data } = await messageApi.start(otherUserId);
          id = data.id;
          setConvId(id);
        }
        await fetchMessages(id);
      } finally { setLoading(false); }
    })();
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchMessages = useCallback(async (id) => {
    const cid = id || convId;
    if (!cid) return;
    try {
      const { data } = await messageApi.messages(cid);
      setMessages(data.results ? data.results : data);
    } catch { /* silent */ }
  }, [convId]);

  useEffect(() => {
    if (!convId) return;
    pollRef.current = setInterval(() => fetchMessages(convId), 3000);
    return () => clearInterval(pollRef.current);
  }, [convId, fetchMessages]);

  const send = async () => {
    if (!text.trim() || !convId) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      await messageApi.send(convId, body);
      await fetchMessages(convId);
      listRef.current?.scrollToEnd({ animated: true });
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const renderMessage = ({ item, index }) => {
    const isMe       = item.sender?.id === user.id;
    const messages_  = messages;
    const prevMsg    = index > 0 ? messages_[index - 1] : null;
    const showAvatar = !isMe && (!prevMsg || prevMsg.sender?.id !== item.sender?.id);

    return (
      <View style={[s.msgRow, isMe ? s.msgMe : s.msgOther]}>
        {!isMe && (
          <View style={{ width: 30, marginRight: 8, alignSelf: 'flex-end' }}>
            {showAvatar && <Avatar uri={item.sender?.avatar} name={item.sender?.full_name} size={28} />}
          </View>
        )}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
          {isMe ? (
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bubbleGrad}>
              <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
              <Text style={s.timeMe}>{format(new Date(item.created_at), 'HH:mm')}</Text>
            </LinearGradient>
          ) : (
            <View style={s.bubbleOtherInner}>
              <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
              <Text style={s.timeOther}>{format(new Date(item.created_at), 'HH:mm')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>👋</Text>
            <Text style={[TYPE.body, { color: C.textMuted, textAlign: 'center' }]}>
              Say hello to {otherName}!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor={C.textFaint}
          value={text}
          onChangeText={setText}
          multiline maxLength={1000}
        />
        <TouchableOpacity activeOpacity={0.85}
          style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={send} disabled={!text.trim() || sending}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <LinearGradient colors={GRADIENT.primary} style={s.sendGrad}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>➤</Text>
              </LinearGradient>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  msgMe:           { justifyContent: 'flex-end' },
  msgOther:        { justifyContent: 'flex-start' },
  bubble:          { maxWidth: '78%' },
  bubbleGrad:      { borderRadius: RADIUS.lg, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther:     {},
  bubbleOtherInner:{ backgroundColor: C.card, borderRadius: RADIUS.lg, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, ...SHADOWS.sm },
  bubbleMe:        {},
  timeMe:          { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, alignSelf: 'flex-end' },
  timeOther:       { fontSize: 10, color: C.textFaint, marginTop: 4, alignSelf: 'flex-end' },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  input:           { flex: 1, backgroundColor: C.bg, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, maxHeight: 100, borderWidth: 1.5, borderColor: C.border },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendGrad:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
