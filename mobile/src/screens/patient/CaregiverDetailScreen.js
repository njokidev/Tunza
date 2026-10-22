import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { caregiverApi, ratingApi } from '../../api';
import { Avatar, Button, Card, Rating, Stars, VerifiedBadge } from '../../components/ui';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import { DAYS_LONG, EXPERIENCE_LEVELS } from '../../lib/constants';
import { firstName, fmtShortTime, kes, unwrap } from '../../lib/format';

/**
 * Caregiver profile (web: CaregiverProfile.jsx).
 * Params: { caregiver, requestId?, request? } — when opened from Smart Match or an
 * application, the request is passed on so the booking form is prefilled.
 */
export default function CaregiverDetailScreen({ route, navigation }) {
  const { caregiver: initial, requestId, request } = route.params;
  const insets = useSafeAreaInsets();
  const [cg, setCg] = useState(initial);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    caregiverApi.detail(initial.id).then((r) => setCg(r.data)).catch(() => {});
    ratingApi.list(initial.id).then((r) => setReviews(unwrap(r.data))).catch(() => {});
  }, [initial.id]);

  const level = EXPERIENCE_LEVELS.find((e) => e.value === cg.experience);
  const availability = cg.availability ?? [];
  const name = cg.user?.full_name || 'Caregiver';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={s.px}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} hitSlop={10}>
            <Feather name="arrow-left" size={18} color={C.textBody} />
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>

          {/* ── Identity ── */}
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Avatar uri={cg.user?.avatar} name={name} size={92} />
            <View style={s.nameRow}>
              <Text style={TYPE.h2}>{name}</Text>
              <VerifiedBadge verified={cg.user?.is_verified} compact />
            </View>
            <View style={s.metaRow}>
              {cg.location_name ? (
                <View style={s.meta}><Feather name="map-pin" size={13} color={C.textMuted} /><Text style={TYPE.caption}>{cg.location_name}</Text></View>
              ) : null}
              <View style={s.meta}>
                <Feather name="briefcase" size={13} color={C.textMuted} />
                <Text style={TYPE.caption}>{cg.years_exp ?? 0} years{level ? ` · ${level.label}` : ''}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}><Rating value={cg.rating_avg} count={cg.rating_count} /></View>
            <View style={[s.avail, { backgroundColor: cg.is_available ? C.successLight : C.muted }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: cg.is_available ? C.success : C.textMuted }}>
                {cg.is_available ? 'Taking new clients' : 'Not taking new clients'}
              </Text>
            </View>
          </Card>

          {cg.specializations?.length ? (
            <View style={s.tags}>
              {cg.specializations.map((sp) => (
                <View key={sp.id} style={s.tag}><Text style={s.tagTxt}>{sp.name}</Text></View>
              ))}
            </View>
          ) : null}

          <Card style={{ marginTop: 14 }}>
            <Text style={s.h}>About</Text>
            <Text style={TYPE.bodyMd}>{cg.bio || `${firstName(name)} hasn't written a bio yet.`}</Text>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <View style={s.hRow}><Feather name="calendar" size={16} color={C.primary} /><Text style={[s.h, { marginBottom: 0 }]}>Weekly availability</Text></View>
            {availability.length === 0 ? (
              <Text style={[TYPE.body, { marginTop: 8 }]}>No fixed schedule listed — message to confirm availability.</Text>
            ) : availability.map((a, i) => (
              <View key={a.id} style={[s.availRow, i > 0 && s.divider]}>
                <Text style={[TYPE.label, { flex: 1 }]}>{DAYS_LONG[a.day] ?? a.day_display}</Text>
                <Text style={TYPE.body}>{fmtShortTime(a.start_time)} – {fmtShortTime(a.end_time)}</Text>
              </View>
            ))}
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={s.h}>Reviews</Text>
            {reviews.length === 0 ? (
              <Text style={TYPE.body}>No reviews yet.</Text>
            ) : reviews.slice(0, 4).map((r, i) => (
              <View key={r.id} style={[{ paddingVertical: 10 }, i > 0 && s.divider]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={TYPE.label}>{r.patient?.full_name || 'Family'}</Text>
                  <Stars score={r.score} size={12} />
                </View>
                {r.comment ? <Text style={[TYPE.body, { marginTop: 4 }]}>{r.comment}</Text> : null}
              </View>
            ))}
          </Card>

          {(cg.languages?.length || cg.day_shift_rate || cg.night_shift_rate) ? (
            <Card style={{ marginTop: 14 }}>
              {cg.languages?.length ? (
                <View style={s.hRow}>
                  <Feather name="message-square" size={15} color={C.primary} />
                  <Text style={[TYPE.body, { flex: 1 }]}>Speaks {cg.languages.join(', ')}</Text>
                </View>
              ) : null}
              {cg.day_shift_rate || cg.night_shift_rate ? (
                <View style={[s.hRow, cg.languages?.length && { marginTop: 10 }]}>
                  <Feather name="sun" size={15} color={C.primary} />
                  <Text style={[TYPE.body, { flex: 1 }]}>
                    {[cg.day_shift_rate && `${kes(cg.day_shift_rate)} per 12-hour day`, cg.night_shift_rate && `${kes(cg.night_shift_rate)} per night`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          <View style={s.trust}>
            <Feather name="shield" size={18} color={C.primary} />
            <Text style={[TYPE.caption, { flex: 1, color: C.textBody }]}>
              You only pay for completed visits. The caregiver confirms before anything is charged.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky booking bar ── */}
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.rate}>{kes(cg.hourly_rate)}</Text>
          <Text style={TYPE.caption}>per hour</Text>
        </View>
        <TouchableOpacity style={s.msgBtn} accessibilityLabel="Message"
          onPress={() => navigation.navigate('Chat', { otherUserId: cg.user?.id, otherName: name })}>
          <Feather name="message-circle" size={20} color={C.text} />
        </TouchableOpacity>
        <Button title="Book now" iconName="calendar" style={{ flex: 1.4 }} disabled={!cg.is_available}
          onPress={() => navigation.navigate('BookCaregiver', { caregiver: cg, requestId, request })} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  px:       { paddingHorizontal: 20 },
  back:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, alignSelf: 'flex-start' },
  backTxt:  { fontSize: 14, fontWeight: '600', color: C.textBody },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avail:    { marginTop: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  tags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag:      { backgroundColor: C.primaryXLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  tagTxt:   { fontSize: 13, fontWeight: '700', color: C.primary },
  h:        { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 8 },
  hRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider:  { borderTopWidth: 1, borderTopColor: C.borderLight },
  trust:    { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: RADIUS.md, padding: 14, marginTop: 14 },
  bar:      { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
  rate:     { fontSize: 20, fontWeight: '800', color: C.primary },
  msgBtn:   { width: 50, height: 50, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
