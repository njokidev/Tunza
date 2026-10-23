import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminApi } from '../../api';
import { Avatar, Button, Card, Empty, LoadingScreen, Notice, ScreenHeader, Segmented } from '../../components/ui';
import { errorMessage, fmtDate, fmtPhone, kes, unwrap } from '../../lib/format';
import { COLORS as C, RADIUS, TYPE } from '../../theme';

const TABS = [
  { value: 'pending', label: 'Waiting' },
  { value: 'verified', label: 'Verified' },
  { value: 'suspended', label: 'Suspended' },
];

// What the admin confirms before a caregiver goes live (same list as the web admin).
const CHECKS = [
  'The ID number matches the name, and I have seen the ID',
  'The CNA certificate and Good Conduct document are genuine and current',
  'I have spoken to the caregiver on the phone number shown',
];

const STATUS = {
  not_submitted: { label: 'No documents yet', bg: C.muted, fg: C.textBody },
  pending:       { label: 'Documents submitted', bg: C.warningLight, fg: C.warning },
  rejected:      { label: 'Sent back', bg: C.dangerLight, fg: C.danger },
  approved:      { label: 'Approved', bg: C.successLight, fg: C.success },
};

const ACTIONS = {
  verify:         { title: 'Approve caregiver', button: 'Approve', variant: 'success', done: 'is now verified and visible to families.' },
  reject:         { title: 'Send back to caregiver', button: 'Send back', variant: 'danger', done: 'was asked to fix their documents.' },
  verify_nurse:   { title: 'Verify nursing certificate', button: 'Verify nurse', variant: 'success', done: 'can now take medication administration jobs.' },
  unverify_nurse: { title: 'Remove nursing verification', button: 'Remove', variant: 'danger', done: 'can no longer take medication administration jobs.' },
  unverify:       { title: 'Remove verification', button: 'Remove verification', variant: 'danger', done: 'is hidden from families until verified again.' },
  suspend:        { title: 'Suspend account', button: 'Suspend', variant: 'danger', done: 'is suspended and can no longer sign in.' },
  reactivate:     { title: 'Reactivate account', button: 'Reactivate', variant: 'primary', done: 'can sign in again.' },
};

const hasCna = (c) => (c.documents ?? []).some((d) => d.doc_type === 'cna');

/**
 * Admin: check each caregiver's documents, then approve or send back
 * (web: pages/admin/Verification.jsx — same tabs, checks and actions).
 */
export default function AdminVerificationScreen() {
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [act, setAct] = useState(null);   // { caregiver, action }
  const req = useRef(0);

  // Debounce the search box.
  useEffect(() => { const t = setTimeout(() => setSearch(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (p = 1) => {
    const id = ++req.current;
    setError('');
    try {
      const { data } = await adminApi.caregivers({ status: tab, search: search || undefined, page: p });
      if (id !== req.current) return;
      const rows = unwrap(data);
      setList((old) => (p === 1 ? rows : [...old, ...rows]));
      setCount(data?.count ?? rows.length);
      setNext(data?.next ?? null);
      setPage(p);
    } catch (e) {
      if (id === req.current) setError(errorMessage(e));
    } finally {
      if (id === req.current) { setLoading(false); setRefreshing(false); }
    }
  }, [tab, search]);

  useEffect(() => { setLoading(true); setList([]); load(1); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} colors={[C.primary]} />}
        onEndReached={() => { if (next && !loading) load(page + 1); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <ScreenHeader title="Verification" subtitle="Check each caregiver's documents before families can find and book them." />
            <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 12 }}>
              <Segmented tabs={TABS.map((t) => ({ ...t, count: t.value === tab ? count : 0 }))} value={tab}
                onChange={(v) => { setTab(v); setFlash(''); }} />
              <View style={st.search}>
                <Feather name="search" size={16} color={C.textFaint} />
                <TextInput value={q} onChangeText={setQ} placeholder="Search name, email, phone, area"
                  placeholderTextColor={C.textFaint} style={st.searchInput} returnKeyType="search" autoCapitalize="none" />
                {q ? <TouchableOpacity onPress={() => setQ('')} hitSlop={8}><Feather name="x-circle" size={16} color={C.textFaint} /></TouchableOpacity> : null}
              </View>
              {flash ? <Notice kind="success">{flash}</Notice> : null}
              {error ? <Notice>{error}</Notice> : null}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <CaregiverItem c={item} tab={tab} onAction={(action) => setAct({ caregiver: item, action })} />
          </View>
        )}
        ListEmptyComponent={loading ? <LoadingScreen message="Loading caregivers…" /> : (
          <Empty iconName="shield" title={tab === 'pending' ? 'No one is waiting' : 'No caregivers here'}
            subtitle={tab === 'pending' ? 'New caregiver sign-ups will appear here for review.' : 'Try a different search.'} />
        )}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />

      <ActionSheet act={act} onClose={() => setAct(null)}
        onDone={(msg) => { setAct(null); setFlash(msg); load(1); }} />
    </View>
  );
}

function CaregiverItem({ c, tab, onAction }) {
  const u = c.user;
  const badge = u.is_verified ? STATUS.approved : STATUS[c.verification_status];
  const docs = c.documents ?? [];
  const canApprove = c.verification_status === 'pending';
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar name={u.full_name} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={TYPE.h4}>{u.full_name}</Text>
          <View style={st.badges}>
            {badge ? <Pill label={u.is_verified ? 'Verified' : badge.label} bg={badge.bg} fg={badge.fg} /> : null}
            {c.nurse_verified ? <Pill label="Verified nurse" bg={C.primaryXLight} fg={C.primary} /> : null}
            {!u.is_active ? <Pill label="Suspended" bg={C.dangerLight} fg={C.danger} /> : null}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 4 }}>
        <Line icon="mail" text={u.email} />
        {u.phone ? <Line icon="phone" text={fmtPhone(u.phone)} onPress={() => Linking.openURL(`tel:+${u.phone}`)} /> : null}
        {c.work_areas?.length || c.location_name ? <Line icon="map-pin" text={c.work_areas?.length ? c.work_areas.join(', ') : c.location_name} /> : null}
        <Line icon="calendar" text={`Joined ${fmtDate(u.date_joined)}`} />
      </View>
      {c.bio ? <Text style={[TYPE.body, { marginTop: 10 }]} numberOfLines={4}>{c.bio}</Text> : null}
      {c.specializations?.length ? (
        <View style={st.badges}>{c.specializations.map((s) => <Pill key={s} label={s} bg={C.muted} fg={C.textBody} />)}</View>
      ) : null}
      <View style={st.stats}>
        <Stat label="Experience" value={`${c.years_exp} yrs`} />
        <Stat label="Rate" value={`${kes(c.hourly_rate)}/h`} />
        <Stat label="Bookings" value={`${c.bookings_completed}/${c.bookings_total}`} />
        <Stat label="Rating" value={c.rating_count ? `★ ${Number(c.rating_avg).toFixed(1)}` : '—'} />
      </View>

      {/* Documents */}
      <View style={st.docs}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={st.docsH}>DOCUMENTS</Text>
          {c.verification_submitted_at ? <Text style={TYPE.caption}>{fmtDate(c.verification_submitted_at)}</Text> : null}
        </View>
        <Line icon="credit-card" text={c.id_number || 'No ID number given'} warn={!c.id_number} mono={!!c.id_number} />
        {docs.length ? docs.map((d) => (
          <TouchableOpacity key={d.id} onPress={() => Linking.openURL(d.url)} style={st.docRow} activeOpacity={0.7}
            accessibilityRole="link" accessibilityLabel={`Open ${d.label}`}>
            <Feather name="file-text" size={15} color={C.textFaint} />
            <Text style={st.docLink} numberOfLines={1}>{d.label}</Text>
            <Feather name="external-link" size={13} color={C.primary} />
          </TouchableOpacity>
        )) : <Line icon="file-text" text="No documents uploaded yet" warn />}
        {docs.length && !hasCna(c) ? <Line icon="alert-triangle" text="No CNA certificate: send back so they can upload it." warn /> : null}
        {docs.length ? <Text style={[TYPE.micro, { marginTop: 6 }]}>Links expire after 15 minutes. Pull down to refresh them.</Text> : null}
        {c.verification_status === 'rejected' && c.verification_note ? (
          <Text style={st.sentBack}>Sent back: {c.verification_note}</Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={st.actions}>
        {tab === 'pending' ? (
          <Button title="Approve" iconName="shield" variant="success" size="sm" disabled={!canApprove || !hasCna(c)}
            onPress={() => onAction('verify')} />
        ) : null}
        {tab === 'pending' && canApprove ? <Button title="Send back" iconName="corner-up-left" variant="outline" size="sm" onPress={() => onAction('reject')} /> : null}
        {tab !== 'suspended' && docs.some((d) => d.doc_type === 'nursing' || d.doc_type === 'cna') ? (
          c.nurse_verified
            ? <Button title="Remove nurse" iconName="award" variant="ghost" size="sm" onPress={() => onAction('unverify_nurse')} />
            : <Button title="Verify nurse" iconName="award" variant="outline" size="sm" onPress={() => onAction('verify_nurse')} />
        ) : null}
        {tab === 'verified' ? <Button title="Remove verification" iconName="shield-off" variant="outline" size="sm" onPress={() => onAction('unverify')} /> : null}
        {tab !== 'suspended'
          ? <Button title="Suspend" iconName="user-x" variant="danger-soft" size="sm" onPress={() => onAction('suspend')} />
          : <Button title="Reactivate" iconName="rotate-ccw" size="sm" onPress={() => onAction('reactivate')} />}
      </View>
    </Card>
  );
}

function ActionSheet({ act, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  const [checks, setChecks] = useState(CHECKS.map(() => false));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setChecks(CHECKS.map(() => false)); setReason(''); setErr(''); setBusy(false); }, [act]);
  if (!act) return null;

  const { caregiver, action } = act;
  const cfg = ACTIONS[action];
  const needsChecks = action === 'verify';
  const needsReason = action === 'suspend' || action === 'unverify' || action === 'reject';
  const ready = (!needsChecks || checks.every(Boolean)) && (!needsReason || reason.trim().length >= 5);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await adminApi.userAction(caregiver.user.id, action, reason.trim());
      onDone(`${caregiver.user.full_name} ${cfg.done}`);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={TYPE.h3}>{cfg.title}</Text>
            <Text style={[TYPE.body, { marginTop: 2, marginBottom: 14 }]}>{caregiver.user.full_name}</Text>
            {err ? <Notice style={{ marginBottom: 12 }}>{err}</Notice> : null}
            {needsChecks ? (
              <>
                <Text style={[TYPE.caption, { marginBottom: 8 }]}>Confirm each check before approving.</Text>
                {CHECKS.map((label, i) => (
                  <TouchableOpacity key={label} activeOpacity={0.8} style={st.check}
                    onPress={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
                    accessibilityRole="checkbox" accessibilityState={{ checked: checks[i] }}>
                    <View style={[st.box, checks[i] && st.boxOn]}>{checks[i] ? <Feather name="check" size={13} color="#fff" /> : null}</View>
                    <Text style={[TYPE.body, { flex: 1 }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
            {needsReason ? (
              <>
                <Text style={[TYPE.label, { marginBottom: 6 }]}>Reason</Text>
                <TextInput value={reason} onChangeText={setReason} multiline style={st.reason} textAlignVertical="top"
                  placeholder={action === 'reject' ? 'e.g. The ID photo is blurry, or the CNA certificate is missing.' : 'Sent to the caregiver with the notification.'}
                  placeholderTextColor={C.textFaint} />
                <Text style={[TYPE.caption, { marginTop: 6 }]}>Sent to the caregiver with the notification.</Text>
              </>
            ) : null}
            {action === 'verify_nurse' ? <Text style={TYPE.body}>Open the nursing or CNA certificate and confirm it is genuine and current (you can check the registration number with the Nursing Council of Kenya). This unlocks medication administration jobs.</Text> : null}
            {action === 'reactivate' ? <Text style={TYPE.body}>They will be able to sign in again. Their verification status stays as it was.</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button title={cfg.button} variant={cfg.variant} onPress={submit} loading={busy} disabled={!ready} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const Pill = ({ label, bg, fg }) => (
  <View style={[st.pill, { backgroundColor: bg }]}><Text style={[st.pillTxt, { color: fg }]}>{label}</Text></View>
);

const Line = ({ icon, text, warn, mono, onPress }) => {
  const body = (
    <View style={st.line}>
      <Feather name={icon} size={14} color={warn ? C.warning : C.textFaint} />
      <Text style={[TYPE.caption, { flex: 1 }, warn && { color: C.warning, fontWeight: '600' }, mono && st.mono, onPress && { color: C.primary, fontWeight: '600' }]}
        numberOfLines={2}>{text}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{body}</TouchableOpacity> : body;
};

const Stat = ({ label, value }) => (
  <View style={{ flex: 1 }}>
    <Text style={TYPE.micro}>{label}</Text>
    <Text style={[TYPE.label, { marginTop: 2 }]} numberOfLines={1}>{value}</Text>
  </View>
);

const st = StyleSheet.create({
  search:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: C.text },
  badges:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  pillTxt:     { fontSize: 11, fontWeight: '700' },
  line:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  mono:        { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), color: C.text },
  stats:       { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight },
  docs:        { marginTop: 12, padding: 12, borderRadius: RADIUS.md, backgroundColor: C.cardSoft, borderWidth: 1, borderColor: C.borderLight },
  docsH:       { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.6 },
  docRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  docLink:     { flex: 1, fontSize: 14, fontWeight: '700', color: C.primary },
  sentBack:    { marginTop: 8, padding: 8, borderRadius: RADIUS.sm ?? 8, backgroundColor: C.dangerLight, color: C.danger, fontSize: 12 },
  actions:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet:       { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  check:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderLight, marginBottom: 8 },
  box:         { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn:       { backgroundColor: C.primary, borderColor: C.primary },
  reason:      { minHeight: 90, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: C.text },
});
