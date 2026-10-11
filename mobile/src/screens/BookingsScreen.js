import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingApi } from '../api';
import { Badge, Avatar, Button, COLORS, Empty, LoadingScreen, Card } from '../components/ui';
import { COLORS as C, GRADIENT, RADIUS, TYPE, SHADOWS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_TABS = ['all','pending','accepted','ongoing','pending_payment','completed'];

export default function BookingsScreen({ navigation }) {
  const { user }                        = useAuth();
  const [bookings,    setBookings]      = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [refreshing,  setRefreshing]    = useState(false);
  const [activeTab,   setActiveTab]     = useState('all');

  const fetch = useCallback(async () => {
    try {
      const { data } = await bookingApi.list();
      setBookings(data.results||data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  const doAction = async (id, action, label) => {
    Alert.alert(`${label}?`, `Confirm: ${label.toLowerCase()} this booking.`, [
      { text:'Cancel', style:'cancel' },
      { text:label, style: action==='cancelled'||action==='rejected' ? 'destructive':'default',
        onPress: async () => {
          try {
            if (action==='accepted'||action==='rejected') await bookingApi.acceptReject(id, {status:action});
            else if (action==='start')     await bookingApi.startService(id);
            else if (action==='end')       await bookingApi.endService(id);
            else if (action==='cancelled') await bookingApi.cancel(id);
            fetch();
          } catch(e) { Alert.alert('Error', e.response?.data?.detail||'Action failed.'); }
        }
      }
    ]);
  };

  const filtered = activeTab==='all' ? bookings : bookings.filter(b=>b.status===activeTab);

  const renderBooking = ({ item }) => {
    const isCG    = user.role==='caregiver';
    const name    = isCG ? item.patient?.full_name : item.caregiver_name;
    const avatar  = isCG ? item.patient?.avatar    : item.caregiver_avatar;

    return (
      <View style={[s.bookingCard, SHADOWS.card]}>
        {/* Status accent top bar */}
        <View style={[s.accentBar, { backgroundColor:
          item.status==='ongoing' ? C.primary :
          item.status==='pending_payment' ? C.warning :
          item.status==='completed' ? C.success : C.border
        }]} />

        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Avatar uri={avatar} name={name||'?'} size={44} />
            <View style={{flex:1, marginLeft:12}}>
              <Text style={TYPE.h4}>{name}</Text>
              <Text style={[TYPE.caption, {marginTop:2, textTransform:'capitalize'}]}>{item.care_type?.replace('_',' ')}</Text>
              <Text style={[TYPE.micro, {marginTop:3}]}>
                📅 {format(new Date(item.scheduled_start),'dd MMM')} → {format(new Date(item.scheduled_end),'dd MMM yyyy')}
              </Text>
            </View>
            <Badge label={item.status} />
          </View>

          <View style={s.amountRow}>
            <View>
              <Text style={TYPE.micro}>
                {item.status==='pending'||item.status==='accepted' ? 'Estimated' : 'Final'} amount
              </Text>
              <Text style={s.amount}>
                KES {item.status==='pending'||item.status==='accepted'
                  ? item.estimated_amount : item.final_amount}
              </Text>
            </View>
            <Badge label={item.is_paid ? 'Paid' : 'Unpaid'} />
          </View>

          {/* ── Action buttons by role & status ── */}
          <View style={s.actionRow}>
            {/* Caregiver */}
            {isCG && item.status==='pending'   && <>
              <Button title="✅ Accept" onPress={()=>doAction(item.id,'accepted','Accept')} style={s.actBtn} />
              <Button title="✕ Reject" variant="outline" onPress={()=>doAction(item.id,'rejected','Reject')} style={s.actBtn} />
            </>}
            {isCG && item.status==='accepted'  &&
              <Button title="🚀 Start Service" onPress={()=>doAction(item.id,'start','Start Service')} style={{flex:1}} />}
            {isCG && item.status==='ongoing'   &&
              <Button title="🏁 End Service" variant="ghost" onPress={()=>doAction(item.id,'end','End Service')} style={{flex:1}} />}

            {/* Patient */}
            {!isCG && item.status==='pending'         &&
              <Button title="Cancel" variant="outline" onPress={()=>doAction(item.id,'cancelled','Cancel')} style={s.actBtn} />}
            {!isCG && item.status==='pending_payment' &&
              <Button title="💳 Confirm & Pay" onPress={()=>navigation.navigate('ConfirmPayment',{booking:item})} style={{flex:1}} />}
            {!isCG && item.status==='ongoing'         &&
              <Button title="📍 Track" variant="ghost" onPress={()=>navigation.navigate('TrackCaregiver',{bookingId:item.id})} style={s.actBtn} />}
            {!isCG && item.status==='completed' && !item.review &&
              <Button title="⭐ Review" variant="ghost" onPress={()=>navigation.navigate('Review',{booking:item})} style={s.actBtn} />}

            {/* Chat always */}
            <TouchableOpacity style={s.chatBtn}
              onPress={()=>navigation.navigate('Chat',{
                otherUserId: isCG ? item.patient?.id : item.caregiver_user_id,
                otherName:   name,
              })}>
              <Text style={{fontSize:14}}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={{flex:1, backgroundColor:C.bg}}>
      <LinearGradient colors={GRADIENT.primary} style={s.header}>
        <Text style={s.headerTitle}>My Bookings</Text>
        <Text style={{color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:2}}>
          {bookings.length} total booking{bookings.length!==1?'s':''}
        </Text>
      </LinearGradient>

      {/* Status filter tabs */}
      ```jsx
<ScrollView
  horizontal
  style={s.tabScroll}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={s.tabRow}
>
  {STATUS_TABS.map(tab => (
    <TouchableOpacity
      key={tab}
      style={[s.tab, activeTab === tab && s.tabActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[s.tabTxt, activeTab === tab && s.tabTxtActive]}
      >
        {tab === 'pending_payment'
          ? 'Pay Due'
          : tab.charAt(0).toUpperCase() + tab.slice(1)}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

 

      <FlatList
        data={filtered}
        keyExtractor={item=> String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={{flexGrow: 1,paddingHorizontal:16,paddingBottom:24, paddingTop:8}}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={()=>{setRefreshing(true);fetch();}} colors={[C.primary]} />}
        ListEmptyComponent={<Empty icon="📅" title="No bookings here"
          subtitle={activeTab==='all' ? 'Your bookings will appear here' : `No ${activeTab} bookings`} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop:16, paddingBottom:20, paddingHorizontal:20 },
  headerTitle: { fontSize:22, fontWeight:'800', color:'#fff' },
  tabScroll:   { flecGrow:0, flexShrink:0},
  tabRow:      { paddingHorizontal:16, paddingVertical:10, gap:8, alignItems:'center'},
  tab:         { alignSelf: 'flex-start', flexGrow:0, flexShrik:0, paddingHorizontal:16, paddingVertical:8, borderRadius:RADIUS.pill, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border },
  tabActive:   { backgroundColor:C.primary, borderColor:C.primary },
  tabTxt:      { fontSize:12, fontWeight:'600', color:C.textMuted },
  tabTxtActive:{ color:'#fff' },
  bookingCard: { backgroundColor:C.card, borderRadius:RADIUS.lg, overflow:'hidden', marginBottom:12 },
  accentBar:   { height:4, width:'100%' },
  cardBody:    { padding:16 },
  cardTop:     { flexDirection:'row', alignItems:'flex-start', marginBottom:12 },
  amountRow:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderTopWidth:1, borderTopColor:C.borderLight, borderBottomWidth:1, borderBottomColor:C.borderLight, marginBottom:12 },
  amount:      { fontSize:18, fontWeight:'800', color:C.primary },
  actionRow:   { flexDirection:'row', gap:8, flexWrap:'wrap' },
  actBtn:      { flex:1, paddingVertical:10 },
  chatBtn:     { width:44, height:44, borderRadius:RADIUS.md, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center' },
});
