import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { locationApi } from '../../api';
import { COLORS, Card } from '../../components/ui';

export default function TrackCaregiverScreen({ route }) {
  const { bookingId }             = route.params;
  const [location, setLocation]   = useState(null);
  const [error,    setError]      = useState(null);
  const [loading,  setLoading]    = useState(true);
  const mapRef                    = useRef(null);

  const fetchLocation = async () => {
    try {
      const { data } = await locationApi.get(bookingId);
      setLocation(data);
      setError(null);
      // Re-center map
      mapRef.current?.animateToRegion({
        latitude:       data.latitude,
        longitude:      data.longitude,
        latitudeDelta:  0.01,
        longitudeDelta: 0.01,
      }, 800);
    } catch (e) {
      if (e.response?.status === 404) {
        setError('Caregiver location not yet shared. They may not have started yet.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const defaultRegion = {
    latitude: -1.286389, longitude: 36.817223,  // Nairobi CBD
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={defaultRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.caregiver}
            description="Your caregiver's current location"
          >
            <View style={styles.caregiverMarker}>
              <Text style={{ fontSize: 26 }}>👩‍⚕️</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Info card overlay */}
      <View style={styles.overlay}>
        {loading ? (
          <Card style={styles.card}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.cardText}>Locating caregiver...</Text>
          </Card>
        ) : error ? (
          <Card style={styles.card}>
            <Text style={styles.errorText}>📍 {error}</Text>
          </Card>
        ) : location ? (
          <Card style={styles.card}>
            <View style={styles.dot} />
            <View>
              <Text style={styles.caregiverName}>👩‍⚕️ {location.caregiver}</Text>
              <Text style={styles.cardText}>
                Last updated {new Date(location.timestamp).toLocaleTimeString()}
              </Text>
              {location.accuracy && (
                <Text style={styles.accuracy}>Accuracy: ±{Math.round(location.accuracy)}m</Text>
              )}
            </View>
          </Card>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:        { position: 'absolute', bottom: 40, left: 16, right: 16 },
  card:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  caregiverMarker:{ backgroundColor: '#fff', borderRadius: 30, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  dot:            { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success },
  caregiverName:  { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardText:       { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  accuracy:       { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  errorText:      { fontSize: 14, color: COLORS.muted },
});
