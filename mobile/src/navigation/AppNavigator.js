import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { COLORS as C, GRADIENT } from '../theme';

// Auth
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Shared
import BookingsScreen       from '../screens/BookingsScreen';
import ChatScreen           from '../screens/ChatScreen';
import ConversationsScreen  from '../screens/ConversationsScreen';
import AccountScreen        from '../screens/AccountScreen';

// Patient
import PatientHomeScreen      from '../screens/patient/HomeScreen';
import CaregiverDetailScreen  from '../screens/patient/CaregiverDetailScreen';
import ConfirmPaymentScreen   from '../screens/patient/ConfirmPaymentScreen';
import TrackCaregiverScreen   from '../screens/patient/TrackCaregiverScreen';
import ReviewScreen           from '../screens/patient/ReviewScreen';

// Caregiver
import CaregiverHomeScreen    from '../screens/caregiver/HomeScreen';
import CaregiverProfileScreen from '../screens/caregiver/ProfileScreen';
import EarningsScreen         from '../screens/caregiver/EarningsScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/DashboardScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab icon component ─────────────────────────────────────────────────────────
const TabIcon = ({ icon, focused }) => (
  focused
    ? <LinearGradient colors={GRADIENT.primary} style={{ width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </LinearGradient>
    : <Text style={{ fontSize: 20, opacity: 0.45 }}>{icon}</Text>
);

const tabOptions = (icon) => ({
  tabBarIcon: ({ focused }) => <TabIcon icon={icon} focused={focused} />,
});

const sharedTabBarStyle = {
  headerShown: false,
  tabBarActiveTintColor:   C.primary,
  tabBarInactiveTintColor: C.textMuted,
  tabBarStyle: {
    borderTopColor:    C.border,
    paddingBottom:     8,
    paddingTop:        6,
    height:            64,
    backgroundColor:   C.card,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
};

// ── Patient tab navigator ──────────────────────────────────────────────────────
function PatientTabs() {
  return (
    <Tab.Navigator screenOptions={sharedTabBarStyle}>
      <Tab.Screen name="Home"     component={PatientHomeScreen}  options={tabOptions('🏠')} />
      <Tab.Screen name="Bookings" component={BookingsScreen}     options={tabOptions('📅')} />
      <Tab.Screen name="Messages" component={ConversationsScreen} options={tabOptions('💬')} />
      <Tab.Screen name="Account"  component={AccountScreen}      options={tabOptions('👤')} />
    </Tab.Navigator>
  );
}

// ── Caregiver tab navigator ────────────────────────────────────────────────────
function CaregiverTabs() {
  return (
    <Tab.Navigator screenOptions={sharedTabBarStyle}>
      <Tab.Screen name="Home"     component={CaregiverHomeScreen}    options={tabOptions('🏠')} />
      <Tab.Screen name="Bookings" component={BookingsScreen}         options={tabOptions('📅')} />
      <Tab.Screen name="Earnings" component={EarningsScreen}         options={tabOptions('💰')} />
      <Tab.Screen name="Messages" component={ConversationsScreen}    options={tabOptions('💬')} />
      <Tab.Screen name="Profile"  component={CaregiverProfileScreen} options={tabOptions('⚙️')} />
    </Tab.Navigator>
  );
}

// ── Admin tab navigator ────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...sharedTabBarStyle, tabBarActiveTintColor: C.primaryDark }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={tabOptions('📊')} />
      <Tab.Screen name="Bookings"  component={BookingsScreen}       options={tabOptions('📅')} />
      <Tab.Screen name="Messages"  component={ConversationsScreen}  options={tabOptions('💬')} />
      <Tab.Screen name="Account"   component={AccountScreen}        options={tabOptions('👤')} />
    </Tab.Navigator>
  );
}

// ── Root navigator ─────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: C.bg }}>
      <LinearGradient colors={GRADIENT.primary} style={{ width:64, height:64, borderRadius:32, alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <Text style={{ fontSize:28 }}>🤝</Text>
      </LinearGradient>
      <ActivityIndicator color={C.primary} />
    </View>
  );

  const headerStyle = {
    headerStyle:      { backgroundColor: C.primary, elevation: 0, shadowOpacity: 0 },
    headerTintColor:  '#fff',
    headerTitleStyle: { fontWeight: '700', fontSize: 17 },
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === 'patient' ? (
        <>
          <Stack.Screen name="PatientTabs"     component={PatientTabs} />
          <Stack.Screen name="CaregiverDetail" component={CaregiverDetailScreen}  options={{ headerShown:true, title:'Caregiver Profile', ...headerStyle }} />
          <Stack.Screen name="ConfirmPayment"  component={ConfirmPaymentScreen}   options={{ headerShown:true, title:'Confirm Payment',   ...headerStyle }} />
          <Stack.Screen name="TrackCaregiver"  component={TrackCaregiverScreen}   options={{ headerShown:true, title:'Live Location',      ...headerStyle }} />
          <Stack.Screen name="Review"          component={ReviewScreen}           options={{ headerShown:false }} />
          <Stack.Screen name="Chat"            component={ChatScreen}             options={{ headerShown:true, ...headerStyle }} />
          <Stack.Screen name="Notifications"   component={AccountScreen}          options={{ headerShown:true, title:'Notifications',      ...headerStyle }} />
        </>
      ) : user.role === 'caregiver' ? (
        <>
          <Stack.Screen name="CaregiverTabs" component={CaregiverTabs} />
          <Stack.Screen name="Chat"          component={ChatScreen}    options={{ headerShown:true, ...headerStyle }} />
        </>
      ) : (
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="Chat"      component={ChatScreen} options={{ headerShown:true, ...headerStyle }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
