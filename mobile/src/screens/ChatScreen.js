import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { messageApi } from '../../api';
import { Avatar, COLORS } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
  const { otherUserId, otherName, convId: existingConvId } = route.params;
  const { user }                  = useAuth();
  const [convId,    setConvId]    = useState(existingConvId || null);
  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const flatRef                   = useRef(null);
  const pollRef                   = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: otherName || 'Chat' });
  }, [otherName]);

  // Init — get or create conversation then start polling
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
      } finally {
        setLoading(false);
      }
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

  // Poll every 3 seconds for new messages
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
      flatRef.current?.scrollToEnd({ animated: true });
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender?.id === user.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && <Avatar uri={item.sender?.avatar} name={item.sender?.full_name} size={30} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{item.body}</Text>
          <Text style={[styles.time, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 40 }}>👋</Text>
            <Text style={{ color: COLORS.muted, marginTop: 8 }}>Say hello to {otherName}!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowMe:    { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble:      { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:    { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bubbleText:  { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  time:        { fontSize: 10, color: COLORS.muted, marginTop: 4, alignSelf: 'flex-end' },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  input:       { flex: 1, backgroundColor: COLORS.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
