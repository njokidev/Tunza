import 'react-native-gesture-handler'; // ← MUST be first import in navigator
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../components/ui';

// Auth
import LoginScreen     from '../screens/auth/LoginScreen';
import RegisterScreen  from '../screens/auth/RegisterScreen';

// Shared
import BookingsScreen       from '../screens/BookingsScreen';
import ChatScreen           from '../screens/ChatScreen';
import ConversationsScreen  from '../screens/ConversationsScreen';
import AccountScreen        from '../screens/AccountScreen';

// Patient
import PatientHomeScreen       from '../screens/patient/HomeScreen';
import CaregiverDetailScreen   from '../screens/patient/CaregiverDetailScreen';
import PaymentScreen           from '../screens/patient/PaymentScreen';
import TrackCaregiverScreen    from '../screens/patient/TrackCaregiverScreen';
import ReviewScreen            from '../screens/patient/ReviewScreen';

// Caregiver
import CaregiverHomeScreen    from '../screens/caregiver/HomeScreen';
import CaregiverProfileScreen from '../screens/caregiver/ProfileScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/DashboardScreen';

const Stack  = createStackNavigator();
const Tab    = createBottomTabNavigator();

const TAB_ICONS = {
  Home:          '🏠', Bookings: '📅',
  Messages:      '💬', Profile:  '👤',
  Dashboard:     '📊', 'My Profile': '⚙️',
};

const tabBarIcon = (name) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[name]}</Text>
);

// ── Patient tabs ──────────────────────────────────────────────────────────────
function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:    false,
        tabBarIcon:     tabBarIcon(route.name),
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { borderTopColor: COLORS.border, paddingBottom: 6, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home"     component={PatientHomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
      <Tab.Screen name="Profile"  component={AccountScreen} />
    </Tab.Navigator>
  );
}

// ── Caregiver tabs ────────────────────────────────────────────────────────────
function CaregiverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:    false,
        tabBarIcon:     tabBarIcon(route.name),
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { borderTopColor: COLORS.border, paddingBottom: 6, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home"       component={CaregiverHomeScreen} />
      <Tab.Screen name="Bookings"   component={BookingsScreen} />
      <Tab.Screen name="Messages"   component={ConversationsScreen} />
      <Tab.Screen name="My Profile" component={CaregiverProfileScreen} />
      <Tab.Screen name="Profile"    component={AccountScreen} />
    </Tab.Navigator>
  );
}

// ── Admin tabs ────────────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:    false,
        tabBarIcon:     tabBarIcon(route.name),
        tabBarActiveTintColor:   COLORS.secondary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { borderTopColor: COLORS.border, paddingBottom: 6, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Bookings"  component={BookingsScreen} />
      <Tab.Screen name="Messages"  component={ConversationsScreen} />
      <Tab.Screen name="Profile"   component={AccountScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth screens
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === 'patient' ? (
        // Patient flow
        <>
          <Stack.Screen name="PatientTabs"      component={PatientTabs} />
          <Stack.Screen name="CaregiverDetail"  component={CaregiverDetailScreen} options={{ headerShown: true, title: 'Caregiver Profile' }} />
          <Stack.Screen name="Payment"          component={PaymentScreen}          options={{ headerShown: true, title: 'Payment' }} />
          <Stack.Screen name="TrackCaregiver"   component={TrackCaregiverScreen}   options={{ headerShown: true, title: 'Track Caregiver' }} />
          <Stack.Screen name="Review"           component={ReviewScreen}           options={{ headerShown: true, title: 'Leave Review' }} />
          <Stack.Screen name="Chat"             component={ChatScreen}             options={{ headerShown: true }} />
          <Stack.Screen name="Notifications"    component={AccountScreen}          options={{ headerShown: true, title: 'Notifications' }} />
        </>
      ) : user.role === 'caregiver' ? (
        // Caregiver flow
        <>
          <Stack.Screen name="CaregiverTabs" component={CaregiverTabs} />
          <Stack.Screen name="Chat"          component={ChatScreen}    options={{ headerShown: true }} />
          <Stack.Screen name="Bookings"      component={BookingsScreen} />
        </>
      ) : (
        // Admin flow
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="Chat"      component={ChatScreen} options={{ headerShown: true }} />
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