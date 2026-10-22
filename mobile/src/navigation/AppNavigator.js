import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { COLORS as C, RADIUS } from '../theme';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// ── Shared ────────────────────────────────────────────────────────────────────
import BookingsScreen      from '../screens/BookingsScreen';
import ChatScreen          from '../screens/ChatScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import AccountScreen       from '../screens/AccountScreen';

// ── Patient ───────────────────────────────────────────────────────────────────
import PatientHomeScreen      from '../screens/patient/HomeScreen';
import BrowseScreen           from '../screens/patient/BrowseScreen';
import CaregiverDetailScreen  from '../screens/patient/CaregiverDetailScreen';
import BookCaregiverScreen    from '../screens/patient/BookCaregiverScreen';
import TrackCaregiverScreen   from '../screens/patient/TrackCaregiverScreen';
import ReviewScreen           from '../screens/patient/ReviewScreen';
import CareNeedsScreen        from '../screens/patient/CareNeedsScreen';
import MatchResultsScreen     from '../screens/patient/MatchResultsScreen';
import MyRequestsScreen       from '../screens/patient/MyRequestsScreen';
import ApplicationsScreen     from '../screens/patient/ApplicationsScreen';

// ── Caregiver ─────────────────────────────────────────────────────────────────
import CaregiverHomeScreen     from '../screens/caregiver/HomeScreen';
import CaregiverProfileScreen  from '../screens/caregiver/ProfileScreen';
import EarningsScreen          from '../screens/caregiver/EarningsScreen';
import OpenRequestsScreen      from '../screens/caregiver/OpenRequestsScreen';
import ApplyToRequestScreen    from '../screens/caregiver/ApplyToRequestScreen';
import VerificationScreen      from '../screens/caregiver/VerificationScreen';

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/admin/DashboardScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.primary } };

// Native header for the few screens that still use one (Chat, Live location).
const headerStyle = {
  headerShown: true,
  headerStyle:      { backgroundColor: C.card, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  headerTintColor:  C.text,
  headerTitleStyle: { fontWeight: '800', fontSize: 17 },
  headerBackTitleVisible: false,
};

// ── Bottom bar (web: mobile bottom nav — icon over label, brand when active) ──
const tabIcon = (name) => ({ color, focused }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 28, borderRadius: RADIUS.pill, backgroundColor: focused ? C.primaryXLight : 'transparent' }}>
    <Feather name={name} size={20} color={color} />
  </View>
);

function useBarOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor:   C.primary,
    tabBarInactiveTintColor: C.textMuted,
    tabBarStyle: {
      borderTopColor: C.borderLight, backgroundColor: C.card,
      height: 62 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8),
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
  };
}

// ── Patient tabs ──────────────────────────────────────────────────────────────
function PatientTabs() {
  const bar = useBarOptions();
  return (
    <Tab.Navigator screenOptions={bar}>
      <Tab.Screen name="Home"     component={PatientHomeScreen}   options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Browse"   component={BrowseScreen}        options={{ title: 'Find care', tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="Bookings" component={BookingsScreen}      options={{ tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="Messages" component={ConversationsScreen} options={{ tabBarIcon: tabIcon('message-circle') }} />
      <Tab.Screen name="Account"  component={AccountScreen}       options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}

// ── Caregiver tabs ────────────────────────────────────────────────────────────
function CaregiverTabs() {
  const bar = useBarOptions();
  return (
    <Tab.Navigator screenOptions={bar}>
      <Tab.Screen name="Home"     component={CaregiverHomeScreen}    options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid') }} />
      <Tab.Screen name="Requests" component={OpenRequestsScreen}     options={{ title: 'Open jobs', tabBarIcon: tabIcon('briefcase') }} />
      <Tab.Screen name="Bookings" component={BookingsScreen}         options={{ tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="Messages" component={ConversationsScreen}    options={{ tabBarIcon: tabIcon('message-circle') }} />
      <Tab.Screen name="Profile"  component={CaregiverProfileScreen} options={{ tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}

// ── Admin tabs ────────────────────────────────────────────────────────────────
function AdminTabs() {
  const bar = useBarOptions();
  return (
    <Tab.Navigator screenOptions={bar}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarIcon: tabIcon('bar-chart-2') }} />
      <Tab.Screen name="Bookings"  component={BookingsScreen}       options={{ tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="Messages"  component={ConversationsScreen}  options={{ tabBarIcon: tabIcon('message-circle') }} />
      <Tab.Screen name="Account"   component={AccountScreen}        options={{ tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <View style={{ width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: C.primary }}>
        <Feather name="heart" size={30} color="#fff" />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.primaryDark, marginBottom: 16 }}>Tunza</Text>
      <ActivityIndicator color={C.primary} />
    </View>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: C.bg } }}>
      {!user ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === 'patient' ? (
        <>
          <Stack.Screen name="PatientTabs"     component={PatientTabs} />
          {/* Find care: Smart Match / open request */}
          <Stack.Screen name="CareNeeds"       component={CareNeedsScreen} />
          <Stack.Screen name="MatchResults"    component={MatchResultsScreen} />
          <Stack.Screen name="MyRequests"      component={MyRequestsScreen} />
          <Stack.Screen name="Applications"    component={ApplicationsScreen} />
          {/* Caregiver → booking */}
          <Stack.Screen name="CaregiverDetail" component={CaregiverDetailScreen} />
          <Stack.Screen name="BookCaregiver"   component={BookCaregiverScreen} />
          {/* During & after care */}
          <Stack.Screen name="TrackCaregiver"  component={TrackCaregiverScreen} options={{ ...headerStyle, title: 'Live location' }} />
          <Stack.Screen name="Review"          component={ReviewScreen} />
          <Stack.Screen name="Chat"            component={ChatScreen} options={headerStyle} />
        </>
      ) : user.role === 'caregiver' ? (
        <>
          <Stack.Screen name="CaregiverTabs"  component={CaregiverTabs} />
          <Stack.Screen name="ApplyToRequest" component={ApplyToRequestScreen} />
          <Stack.Screen name="Verification"   component={VerificationScreen} />
          <Stack.Screen name="Earnings"       component={EarningsScreen} />
          <Stack.Screen name="AccountDetails" component={AccountScreen} />
          <Stack.Screen name="Chat"           component={ChatScreen} options={headerStyle} />
        </>
      ) : (
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="Chat"      component={ChatScreen} options={headerStyle} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
