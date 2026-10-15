
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { caregiverApi } from '../../api';
import {
  CaregiverCard,
  Chip,
  Empty,
  LoadingScreen,
} from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const CARE_TYPES = [
  { key: 'elderly', label: 'Elderly care', icon: '👵' },
  { key: 'postop', label: 'Post-surgery', icon: '🏥' },
  { key: 'dementia', label: 'Dementia care', icon: '💜' },
  { key: 'chronic', label: 'Chronic illness', icon: '🩺' },
  { key: 'palliative', label: 'Palliative care', icon: '🤍' },
  { key: 'companionship', label: 'Companionship', icon: '🤝' },
  { key: 'daily_living', label: 'Daily assistance', icon: '🏠' },
  { key: 'overnight', label: 'Overnight care', icon: '🌙' },
];

const FILTERS = [
  { label: 'All', params: {} },
  { label: 'Available', params: { is_available: true } },
  { label: 'Top Rated', params: { ordering: '-rating_avg' } },
  { label: 'Affordable', params: { ordering: 'hourly_rate' } },
];

export default function PatientHomeScreen({ navigation }) {
  const { user } = useAuth();

  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);
  const [selectedCare, setSelectedCare] = useState(null);

  const fetchCaregivers = useCallback(
    async (query = search, filterIndex = activeFilter) => {
      try {
        const params = { ...FILTERS[filterIndex].params };

        if (query.trim()) params.search = query.trim();

        const { data } = await caregiverApi.list(params);
        setCaregivers(data.results || data);
      } catch (error) {
        console.error('Could not load caregivers:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeFilter]
  );

  useEffect(() => {
    fetchCaregivers();
  }, [activeFilter]);

  const firstName =
    user?.full_name?.split(' ')[0] || 'there';

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening';

  const openCaregiver = (caregiver) => {
    navigation.navigate('CaregiverDetail', { caregiver });
  };

  const visibleCaregivers = selectedCare
    ? caregivers.filter((caregiver) => {
        const careKey = selectedCare.toLowerCase();

        const values = [
          caregiver.bio,
          caregiver.specialization,
          caregiver.specialization_name,
          caregiver.care_type,
          ...(Array.isArray(caregiver.specializations)
            ? caregiver.specializations.map((item) => item.name)
            : []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const aliases = {
          elderly: ['elderly', 'geriatric', 'senior'],
          postop: ['postop', 'post-op', 'post surgery', 'surgery'],
          dementia: ['dementia', 'alzheimer'],
          chronic: ['chronic', 'long-term illness'],
          palliative: ['palliative', 'end-of-life'],
          companionship: ['companionship', 'companion'],
          daily_living: ['daily assistance', 'personal care', 'daily living'],
          overnight: ['overnight', 'night care'],
        };

        return (aliases[careKey] || [careKey]).some((term) =>
          values.includes(term)
        );
      })
    : caregivers;

  if (loading) {
    return <LoadingScreen message="Finding caregivers for you..." />;
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={visibleCaregivers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CaregiverCard
            item={item}
            onPress={() => openCaregiver(item)}
          />
        )}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={GRADIENT.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.header}
            >
              <View style={s.headerTop}>
                <View style={s.greetingWrap}>
                  <Text style={s.greeting}>
                    {greeting}, {firstName} 👋
                  </Text>
                  <Text style={s.subtitle}>
                    Trusted care, in the comfort of home.
                  </Text>
                </View>

                <TouchableOpacity
                  style={s.notifButton}
                  onPress={() =>
                    navigation.navigate('Notifications')
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                >
                  <Text style={s.notifIcon}>♧</Text>
                </TouchableOpacity>
              </View>

              <View style={s.searchBar}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => fetchCaregivers(search)}
                  placeholder="Search caregivers or locations"
                  placeholderTextColor="#8B8797"
                  returnKeyType="search"
                  style={s.searchInput}
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearch('');
                      fetchCaregivers('', activeFilter);
                    }}
                  >
                    <Text style={s.clearSearch}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>

            <View style={s.content}>
              <Text style={s.sectionTitle}>Get started</Text>

              <View style={s.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={s.bookCard}
                  onPress={() =>
                    navigation.navigate('CaregiverDetail', {
                      caregiver: caregivers[0],
                    })
                  }
                  disabled={!caregivers.length}
                >
                  <View style={s.actionIconLight}>
                    <Text style={s.actionIconText}>＋</Text>
                  </View>
                  <Text style={s.bookTitle}>Book a caregiver</Text>
                  <Text style={s.bookSubtitle}>
                    Find the right care for your family
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={s.quickCard}
                  onPress={() => navigation.navigate('Bookings')}
                >
                  <View style={s.quickIcon}>
                    <Text style={s.quickIconText}>▣</Text>
                  </View>
                  <Text style={s.quickTitle}>My bookings</Text>
                  <Text style={s.quickSubtitle}>
                    View your care schedule
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s.careHeadingRow}>
                <View style={s.careHeadingCopy}>
                  <Text style={s.sectionTitle}>
                    What type of care do you need?
                  </Text>
                  <Text style={s.sectionSubtitle}>
                    Choose the support that best fits your needs.
                  </Text>
                </View>
                {selectedCare && (
                  <TouchableOpacity
                    onPress={() => setSelectedCare(null)}
                  >
                    <Text style={s.clearCare}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s.careGrid}>
                {CARE_TYPES.map((care) => {
                  const selected = selectedCare === care.key;

                  return (
                    <TouchableOpacity
                      key={care.key}
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedCare(selected ? null : care.key)
                      }
                      style={[
                        s.careOption,
                        selected && s.careOptionSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={s.careEmoji}>{care.icon}</Text>
                      <Text
                        style={[
                          s.careLabel,
                          selected && s.careLabelSelected,
                        ]}
                      >
                        {care.label}
                      </Text>
                      {selected && (
                        <Text style={s.selectedCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.recommendHeading}>
                <View>
                  <Text style={s.sectionTitle}>
                    {selectedCare
                      ? 'Caregivers for your needs'
                      : 'Recommended caregivers'}
                  </Text>
                  <Text style={s.sectionSubtitle}>
                    Explore profiles, experience and reviews.
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
              >
                {FILTERS.map((filter, index) => (
                  <Chip
                    key={filter.label}
                    label={filter.label}
                    active={activeFilter === index}
                    onPress={() => setActiveFilter(index)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        }
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCaregivers();
            }}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Empty
              icon="👩‍⚕️"
              title="No matching caregivers found"
              subtitle={
                selectedCare
                  ? 'Try another care category or clear your selection.'
                  : 'Try a different search or remove your filters.'
              }
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  greetingWrap: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 6,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  searchBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 25,
    color: C.primary,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },
  clearSearch: {
    color: C.textMuted,
    fontSize: 17,
    paddingLeft: 8,
  },
  content: {
    paddingTop: 22,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 14,
    marginBottom: 26,
  },
  bookCard: {
    flex: 1,
    minHeight: 142,
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-end',
  },
  actionIconLight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIconText: {
    fontSize: 26,
    color: C.primary,
    lineHeight: 30,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bookSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  quickCard: {
    flex: 1,
    minHeight: 142,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: C.borderLight,
    elevation: 2,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickIconText: {
    fontSize: 19,
    color: C.primary,
  },
  quickTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  quickSubtitle: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  careHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  careHeadingCopy: {
    flex: 1,
  },
  clearCare: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 26,
  },
  careOption: {
    width: '48%',
    flexGrow: 1,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  careOptionSelected: {
    backgroundColor: C.primaryXLight,
    borderColor: C.primary,
  },
  careEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  careLabel: {
    flex: 1,
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  careLabelSelected: {
    color: C.primary,
  },
  selectedCheck: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 4,
  },
  recommendHeading: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
