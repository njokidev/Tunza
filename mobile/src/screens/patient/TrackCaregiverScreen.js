import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { locationApi } from '../../api';
import { Card, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';

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

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  const nairobi = { latitude: -1.286389, longitude: 36.817223, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={{ flex: 1 }}>
      {/* Map fills screen */}
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
          <View style={[s.liveCard, SHADOWS.lg]}>
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
          </View>
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
  liveDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', flexShrink: 0 },
});
