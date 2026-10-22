import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/MapView';
import { LinearGradient } from 'expo-linear-gradient';
import { locationApi } from '../../api';
import usePolling from '../../lib/usePolling';
import { Card, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';

// On Android, Google Maps crashes the app if no API key was built in. The APK
// build sets EXPO_PUBLIC_MAPS_ENABLED=true only when a key is provided; without
// one we show a plain background and an "Open in Google Maps" button instead.
const MAPS_ENABLED = Platform.OS === 'ios' || (Platform.OS === 'android' && process.env.EXPO_PUBLIC_MAPS_ENABLED === 'true');

const openInMaps = ({ latitude, longitude }) => {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
};

export default function TrackCaregiverScreen({ route, navigation }) {
  const { bookingId }           = route.params;
  const [location, setLocation] = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastSeen, setLastSeen] = useState(null);
  const mapRef                  = useRef(null);

  const fetchLocation = async () => {
    try {
      const { data } = await locationApi.get(bookingId);
      setLocation(data);
      setLastSeen(new Date());
      setError(null);
      mapRef.current?.animateToRegion({
        latitude: data.latitude, longitude: data.longitude,
        latitudeDelta: 0.008, longitudeDelta: 0.008,
      }, 600);
    } catch (e) {
      if (e.response?.status === 404)
        setError('Caregiver hasn\'t shared their location yet.');
    } finally { setLoading(false); }
  };

  // Live location: every 15s, only while this map is open and the app is active.
  usePolling(fetchLocation, 15000, []);

  const nairobi = { latitude: -1.286389, longitude: 36.817223, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={{ flex: 1 }}>
      {/* Map fills screen */}
      {MAPS_ENABLED ? (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={nairobi}
        showsUserLocation
        showsMyLocationButton
        showsCompass
      >
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.caregiver} description="Your caregiver's live location">
            <View style={s.pin}>
              <LinearGradient colors={GRADIENT.primary} style={s.pinGrad}>
                <Text style={{ fontSize: 22 }}>👩‍⚕️</Text>
              </LinearGradient>
              <View style={s.pinTail} />
            </View>
          </Marker>
        )}
      </MapView>
      ) : (
        <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={[StyleSheet.absoluteFill, s.noMap]}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={[TYPE.body, { color: C.textMuted, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
            Live map coming soon. Tap the card below to see your caregiver in Google Maps.
          </Text>
        </LinearGradient>
      )}

      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={{ color: C.primary, fontWeight: '700', fontSize: 16 }}>←</Text>
      </TouchableOpacity>

      {/* Status card at bottom */}
      <View style={s.overlay}>
        {loading ? (
          <Card style={s.statusCard}>
            <ActivityIndicator color={C.primary} />
            <Text style={[TYPE.body, { marginLeft: 12 }]}>Locating caregiver...</Text>
          </Card>
        ) : error ? (
          <Card style={s.statusCard}>
            <Text style={{ fontSize: 24 }}>📍</Text>
            <Text style={[TYPE.body, { flex: 1, marginLeft: 12, color: C.textMuted }]}>{error}</Text>
          </Card>
        ) : location ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => openInMaps(location)} style={[s.liveCard, SHADOWS.lg]}>
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.liveGrad}>
              <View style={s.liveDot} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  👩‍⚕️ {location.caregiver}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                  Live location · Updated {lastSeen ? lastSeen.toLocaleTimeString() : '—'}
                </Text>
              </View>
              {location.accuracy && (
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                  ±{Math.round(location.accuracy)}m
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn:  { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  overlay:  { position: 'absolute', bottom: 40, left: 16, right: 16 },
  statusCard:{ flexDirection: 'row', alignItems: 'center' },
  pin:       { alignItems: 'center' },
  pinGrad:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', ...SHADOWS.md },
  pinTail:   { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: C.primaryDark, marginTop: -2 },
  liveCard:  { borderRadius: RADIUS.lg, overflow: 'hidden' },
  liveGrad:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  noMap:     { alignItems: 'center', justifyContent: 'center' },
  liveDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', flexShrink: 0 },
});
