import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { caregiverApi } from '../../api';
import { CaregiverCard, Chip, COLORS, Empty, LoadingScreen, Avatar } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, TYPE } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const FILTERS = [
  { label:'All',         params:{} },
  { label:'Available',   params:{ is_available:true } },
  { label:'Top Rated',   params:{ ordering:'-rating_avg' } },
  { label:'Affordable',  params:{ ordering:'hourly_rate' } },
];

export default function PatientHomeScreen({ navigation }) {
  const { user }                    = useAuth();
  const [caregivers, setCaregivers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [activeF,    setActiveF]    = useState(0);

  const fetch = useCallback(async (q=search) => {
    try {
      const params = { ...FILTERS[activeF].params };
      if (q) params.search = q;
      const { data } = await caregiverApi.list(params);
      setCaregivers(data.results || data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeF, search]);

  useEffect(() => { fetch(); }, [activeF]);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <LoadingScreen message="Finding caregivers near you..." />;

  return (
    <View style={{flex:1, backgroundColor:C.bg}}>

      {/* ── Gradient header ── */}
      <LinearGradient colors={GRADIENT.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{greeting}, {firstName} 👋</Text>
            <Text style={s.subGreeting}>Find the right caregiver for you</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={{fontSize:20}}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar floats inside header */}
        <View style={s.searchBar}>
          <Text style={{fontSize:16, marginRight:8}}>🔍</Text>
          <TextInput
            placeholder="Name, specialization, area..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetch(search)}
            style={s.searchInput}
            placeholderTextColor={C.textFaint}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetch(''); }}>
              <Text style={{color:C.textFaint, fontSize:16}}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Filter chips ── */}
      <ScrollView 
       style={{ flexGrow:0, flexShrink:0}}
       horizontal
       showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}>
        {FILTERS.map((f,i) => (
          <Chip key={i} label={f.label} active={activeF===i} onPress={() => setActiveF(i)} />
        ))}
      </ScrollView>

      {/* ── Caregiver list ── */}
      <FlatList
        data={caregivers}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <CaregiverCard
            item={item}
            onPress={() => navigation.navigate('CaregiverDetail', { caregiver:item })}
          />
        )}
        contentContainerStyle={{flexGrow:1, paddingHorizontal:16, paddingBottom:24, paddingTop:4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            colors={[C.primary]} tintColor={C.primary} />
        }
        ListEmptyComponent={
          <Empty icon="👩‍⚕️" title="No caregivers found"
            subtitle="Try a different search or remove filters" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop:56, paddingBottom:28, paddingHorizontal:20 },
  headerTop:   { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  greeting:    { fontSize:20, fontWeight:'800', color:'#fff' },
  subGreeting: { fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2 },
  notifBtn:    { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
  searchBar:   { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:RADIUS.md, paddingHorizontal:14, height:56 },
  searchInput: { flex:1, fontSize:14, color:C.text , paddingVertical:0 },
  filterRow:   { paddingHorizontal:16, paddingVertical:10, gap:8 ,alignItems: 'center' },
});
