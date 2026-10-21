import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { caregiverApi } from '../../api';
import { Button, CaregiverCard, Chip, Empty, LoadingScreen, Notice, ScreenHeader } from '../../components/ui';
import { COLORS as C, RADIUS } from '../../theme';
import { errorMessage, unwrap } from '../../lib/format';

const SORTS = [
  { value: '-rating_avg',  label: 'Top rated' },
  { value: 'hourly_rate',  label: 'Lowest rate' },
  { value: '-years_exp',   label: 'Most experienced' },
];
const RATES = [
  { value: '',     label: 'Any rate' },
  { value: '500',  label: '≤ KES 500/hr' },
  { value: '800',  label: '≤ KES 800/hr' },
  { value: '1200', label: '≤ KES 1,200/hr' },
];

/** Browse & filter verified caregivers, then book one directly (web: Browse.jsx). */
export default function BrowseScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [spec, setSpec] = useState('');
  const [rate, setRate] = useState('');
  const [ordering, setOrdering] = useState('-rating_avg');
  const [specs, setSpecs] = useState([]);
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    caregiverApi.specializations().then((r) => setSpecs(unwrap(r.data))).catch(() => {});
  }, []);

  // Debounce typing.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { ordering, is_available: 'true' };
      if (query) params.search = query;
      if (spec) params.specializations = spec;
      if (rate) params.max_rate = rate;
      const { data } = await caregiverApi.list(params);
      const rows = unwrap(data);
      setList(rows);
      setCount(data?.count ?? rows.length);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, spec, rate, ordering]);

  useEffect(() => { load(); }, [load]);

  const header = (
    <View>
      <ScreenHeader title="Find a caregiver" subtitle="Verified caregivers near you. Compare and book directly." />

      <View style={s.px}>
        <View style={s.search}>
          <Feather name="search" size={17} color={C.textFaint} />
          <TextInput
            value={q} onChangeText={setQ} placeholder="Search by name, area or specialty"
            placeholderTextColor={C.textFaint} style={s.searchInput} returnKeyType="search"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ('')} hitSlop={8}><Feather name="x" size={17} color={C.textFaint} /></TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        <Chip label="All specialties" active={!spec} onPress={() => setSpec('')} />
        {specs.map((sp) => (
          <Chip key={sp.id} label={sp.name} active={String(spec) === String(sp.id)} onPress={() => setSpec(spec === sp.id ? '' : sp.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.row, { paddingTop: 0 }]}>
        {SORTS.map((o) => <Chip key={o.value} label={o.label} active={ordering === o.value} onPress={() => setOrdering(o.value)} />)}
        <View style={s.sep} />
        {RATES.map((o) => <Chip key={o.label} label={o.label} active={rate === o.value} onPress={() => setRate(o.value)} />)}
      </ScrollView>

      {error ? <Notice style={{ marginHorizontal: 20, marginBottom: 12 }}>{error}</Notice> : null}
      {!loading && list.length > 0 ? (
        <Text style={s.count}>{count} caregiver{count === 1 ? '' : 's'} available</Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={loading ? [] : list}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={s.px}>
            <CaregiverCard
              item={item}
              onPress={() => navigation.navigate('CaregiverDetail', { caregiver: item })}
              onBook={() => navigation.navigate('BookCaregiver', { caregiver: item })}
              footer={<Button title="Profile" size="sm" variant="outline" onPress={() => navigation.navigate('CaregiverDetail', { caregiver: item })} />}
            />
          </View>
        )}
        ListEmptyComponent={loading ? <LoadingScreen message="Finding caregivers…" /> : (
          <View style={s.px}>
            <Empty iconName="users" title="No caregivers found"
              subtitle="Try clearing filters — or post an open request and let caregivers come to you."
              action="Post an open request" onAction={() => navigation.navigate('CareNeeds', { path: 'open_request' })} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.primary]} tintColor={C.primary} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  px:          { paddingHorizontal: 20 },
  search:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.text },
  row:         { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  sep:         { width: 1, backgroundColor: C.border, marginHorizontal: 4 },
  count:       { fontSize: 13, color: C.textMuted, paddingHorizontal: 20, marginBottom: 10 },
});
