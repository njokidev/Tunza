import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bookingApi, careRequestApi, caregiverApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Avatar, Card, CaregiverTile, Empty, SectionLabel, StatusPill,
} from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';
import { BOOKING_STATUS, CARE_RECIPIENTS, REQUEST_STATUS } from '../../lib/constants';
import { firstName, fmtDate, fmtDay, fmtTime, greeting, recipientLabel, unwrap } from '../../lib/format';

/**
 * Patient home — the "Book a caregiver" button is the first thing on screen.
 *
 * Three ways to find care (same as web/src/pages/patient/Home.jsx):
 *   1. Book a caregiver  → Smart Match (care needs → ranked matches → book)
 *   2. Quick book        → Browse available caregivers → profile → book
 *   3. Post a request    → caregivers apply → pick one → book
 */
export default function PatientHomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ caregivers: [], bookings: [], requests: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [cgs, bks, reqs] = await Promise.allSettled([
      caregiverApi.list({ is_available: 'true', ordering: '-rating_avg' }),
      bookingApi.list(),
      careRequestApi.mine(),
    ]);
    setData({
      caregivers: cgs.status === 'fulfilled' ? unwrap(cgs.value.data) : [],
      bookings: bks.status === 'fulfilled' ? unwrap(bks.value.data) : [],
      requests: reqs.status === 'fulfilled' ? unwrap(reqs.value.data) : [],
    });
    setRefreshing(false);
  }, []);

  // Refresh whenever the tab comes back into focus (e.g. after booking).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upcoming = data.bookings
    .filter((b) => ['pending', 'accepted', 'ongoing'].includes(b.status))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 2);
  const activeRequests = data.requests.filter((r) => !['closed', 'cancelled', 'booked'].includes(r.status));
  const nearby = data.caregivers.slice(0, 4);

  const startSmartMatch = (care_recipient) => navigation.navigate('CareNeeds', { path: 'smart_match', care_recipient });
  const openRequest = (r) => navigation.navigate(
    r.discovery_path === 'open_request' ? 'Applications' : 'MatchResults',
    { requestId: r.id, request: r },
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
    >
      {/* ── Greeting ── */}
      <View style={[s.px, s.greetRow]}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetSmall}>{greeting()}</Text>
          <Text style={s.greet}>Hello {firstName(user?.full_name)} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Account')} accessibilityLabel="Your profile">
          <Avatar uri={user?.avatar} name={user?.full_name} size={44} />
        </TouchableOpacity>
      </View>

      {/* ── Primary actions: Book now + Quick book ── */}
      <View style={[s.px, s.actionRow]}>
        <TouchableOpacity activeOpacity={0.9} style={[s.bookCard, SHADOWS.md]} onPress={() => startSmartMatch()}>
          <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bookInner}>
            <View style={s.bookGlow} />
            <View style={s.plus}><Feather name="plus" size={20} color={C.primary} /></View>
            <View>
              <Text style={s.bookTitle}>Book a caregiver</Text>
              <Text style={s.bookSub}>Get matched in minutes</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={[s.quickCard, SHADOWS.card]}
          onPress={() => navigation.navigate('Browse', { available: true })}>
          <View style={s.quickIcon}><Feather name="zap" size={16} color={C.primary} /></View>
          <View>
            <Text style={s.quickTitle}>Quick book</Text>
            <Text style={s.quickSub}>Available caregivers</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── What do you need help with? (prefills Smart Match) ── */}
      <View style={[s.px, { marginTop: 26 }]}>
        <Text style={s.h}>What kind of care do you need?</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.px, { gap: 8, paddingVertical: 12 }]}>
        {CARE_RECIPIENTS.filter((r) => r.value !== 'other').map((r) => (
          <TouchableOpacity key={r.value} activeOpacity={0.85} style={s.needChip} onPress={() => startSmartMatch(r.value)}>
            <Feather name={r.icon} size={14} color={C.primary} />
            <Text style={s.needTxt}>{r.short}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Upcoming care ── */}
      {upcoming.length > 0 ? (
        <View style={[s.px, { marginTop: 14 }]}>
          <SectionLabel label="Upcoming care" action="All bookings" onAction={() => navigation.navigate('Bookings')} />
          <Card noPad>
            {upcoming.map((b, i) => (
              <TouchableOpacity key={b.id} activeOpacity={0.85} onPress={() => navigation.navigate('Bookings')}
                style={[s.listRow, i > 0 && s.listDivider]}>
                <Avatar uri={b.caregiver?.user?.avatar} name={b.caregiver?.user?.full_name} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={TYPE.h4} numberOfLines={1}>{b.caregiver?.user?.full_name}</Text>
                  <Text style={TYPE.caption}>{fmtDay(b.start_date)} · {fmtTime(b.start_date)}</Text>
                </View>
                <StatusPill map={BOOKING_STATUS} status={b.status} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ) : null}

      {/* ── Active care requests ── */}
      {activeRequests.length > 0 ? (
        <View style={[s.px, { marginTop: 22 }]}>
          <SectionLabel label="My care requests" action="View all" onAction={() => navigation.navigate('MyRequests')} />
          <Card noPad>
            {activeRequests.slice(0, 2).map((r, i) => (
              <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => openRequest(r)}
                style={[s.listRow, i > 0 && s.listDivider]}>
                <View style={s.reqIcon}>
                  <Feather name={r.discovery_path === 'open_request' ? 'radio' : 'zap'} size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={TYPE.h4} numberOfLines={1}>{recipientLabel(r.care_recipient)}</Text>
                  <Text style={TYPE.caption} numberOfLines={1}>
                    {r.discovery_path === 'open_request' ? 'Open request' : 'Smart Match'} · from {fmtDate(r.start_date)}
                  </Text>
                </View>
                <StatusPill map={REQUEST_STATUS} status={r.status} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ) : null}

      {/* ── Caregivers near you (grid like the design) ── */}
      <View style={[s.px, { marginTop: 22 }]}>
        <SectionLabel label="Caregivers available now" action="See all" onAction={() => navigation.navigate('Browse')} />
        {nearby.length === 0 ? (
          <Empty iconName="users" title="No caregivers available right now"
            subtitle="Post your care need and caregivers will apply to you."
            action="Post a request" onAction={() => navigation.navigate('CareNeeds', { path: 'open_request' })} />
        ) : (
          <View style={s.grid}>
            {nearby.map((cg) => (
              <View key={cg.id} style={s.gridCell}>
                <CaregiverTile item={cg} onPress={() => navigation.navigate('CaregiverDetail', { caregiver: cg })} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Post an open request ── */}
      <View style={[s.px, { marginTop: 18 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('CareNeeds', { path: 'open_request' })}>
          <Card style={s.postCard}>
            <View style={s.reqIcon}><Feather name="radio" size={18} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.h4}>Post an open request</Text>
              <Text style={TYPE.caption}>Publish your need and let caregivers apply with their rate.</Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textFaint} />
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  px:          { paddingHorizontal: 20 },
  greetRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  greetSmall:  { fontSize: 13, fontWeight: '700', color: C.primary },
  greet:       { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginTop: 2 },

  actionRow:   { flexDirection: 'row', gap: 12 },
  bookCard:    { flex: 1.15, borderRadius: RADIUS.xl, overflow: 'hidden' },
  bookInner:   { minHeight: 150, padding: 16, justifyContent: 'space-between' },
  bookGlow:    { position: 'absolute', right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(143,95,211,0.45)' },
  plus:        { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bookTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  bookSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  quickCard:   { flex: 1, borderRadius: RADIUS.xl, backgroundColor: C.card, padding: 16, justifyContent: 'space-between', borderWidth: 1, borderColor: C.borderLight },
  quickIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  quickTitle:  { fontSize: 16, fontWeight: '800', color: C.text },
  quickSub:    { fontSize: 12, color: C.textMuted, marginTop: 2 },

  h:           { fontSize: 17, fontWeight: '800', color: C.text },
  needChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  needTxt:     { fontSize: 13, fontWeight: '700', color: C.text },

  listRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  listDivider: { borderTopWidth: 1, borderTopColor: C.borderLight },
  reqIcon:     { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridCell:    { width: '50%', padding: 6 },
  postCard:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
