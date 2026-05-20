import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { caregiverApi } from '../../api';
import { Card, Avatar, Stars, Badge, COLORS, Empty, LoadingScreen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const FILTERS = [
  { label: 'All',        params: {} },
  { label: 'Available',  params: { is_available: true } },
  { label: 'Top Rated',  params: { ordering: '-rating_avg' } },
  { label: 'Affordable', params: { ordering: 'hourly_rate' } },
];

export default function PatientHomeScreen({ navigation }) {
  const { user }                     = useAuth();
  const [caregivers, setCaregivers]  = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [refreshing, setRefreshing]  = useState(false);
  const [search,     setSearch]      = useState('');
  const [activeFilter, setFilter]    = useState(0);

  const fetchCaregivers = useCallback(async (searchTerm = search) => {
    try {
      const params = { ...FILTERS[activeFilter].params };
      if (searchTerm) params.search = searchTerm;
      const { data } = await caregiverApi.list(params);
      setCaregivers(data.results || data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, search]);

  useEffect(() => { fetchCaregivers(); }, [activeFilter]);

  const onRefresh = () => { setRefreshing(true); fetchCaregivers(); };

  const renderCaregiver = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CaregiverDetail', { caregiver: item })}>
      <Card style={styles.caregiverCard}>
        <View style={styles.cardTop}>
          <Avatar uri={item.user?.avatar} name={item.user?.full_name} size={56} />
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.user?.full_name}</Text>
            <Text style={styles.location}>📍 {item.location_name || 'Nairobi'}</Text>
            <Stars score={Math.round(item.rating_avg)} />
            <Text style={styles.ratingText}>{item.rating_avg} ({item.rating_count} reviews)</Text>
          </View>
          <View style={styles.cardRight}>
            <Badge label={item.is_available ? 'Available' : 'Busy'} />
            <Text style={styles.rate}>KES {item.hourly_rate}/hr</Text>
          </View>
        </View>
        {item.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        ) : null}
        {item.specializations?.length > 0 && (
          <View style={styles.tags}>
            {item.specializations.slice(0, 3).map(s => (
              <View key={s.id} style={styles.tag}>
                <Text style={styles.tagText}>{s.name}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (loading) return <LoadingScreen message="Finding caregivers..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Find a caregiver near you</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Text style={{ fontSize: 26 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={{ marginRight: 8 }}>🔍</Text>
        <TextInput
          placeholder="Search by name, specialization, area..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchCaregivers(search)}
          style={styles.searchInput}
          placeholderTextColor={COLORS.muted}
          returnKeyType="search"
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, activeFilter === i && styles.chipActive]}
            onPress={() => setFilter(i)}
          >
            <Text style={[styles.chipText, activeFilter === i && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={caregivers}
        keyExtractor={item => item.id}
        renderItem={renderCaregiver}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Empty icon="👩‍⚕️" title="No caregivers found" subtitle="Try adjusting your search or filters" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting:       { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subGreeting:    { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, margin: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput:    { flex: 1, fontSize: 14, color: COLORS.text },
  filterRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  caregiverCard:  { marginBottom: 4 },
  cardTop:        { flexDirection: 'row', gap: 12 },
  cardInfo:       { flex: 1, gap: 2 },
  cardRight:      { alignItems: 'flex-end', gap: 6 },
  name:           { fontSize: 16, fontWeight: '700', color: COLORS.text },
  location:       { fontSize: 12, color: COLORS.muted },
  ratingText:     { fontSize: 11, color: COLORS.muted },
  rate:           { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bio:            { fontSize: 13, color: COLORS.muted, marginTop: 10, lineHeight: 18 },
  tags:           { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag:            { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText:        { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
});
