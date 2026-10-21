import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ratingApi } from '../../api';
import { Card, Input, Button, Avatar, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE } from '../../theme';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewScreen({ route, navigation }) {
  const { booking }             = route.params;
  const [score,   setScore]     = useState(5);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await ratingApi.create({
        caregiver: booking.caregiver?.id || booking.caregiver_id,
        booking:   booking.id,
        score, comment,
      });
      Alert.alert('Thank you! ⭐', 'Your review helps other patients find great caregivers.', [
        { text: 'Done', onPress: () => navigation.navigate('PatientTabs', { screen: 'Bookings' }) },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit review.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Text style={s.headerTitle}>Leave a Review</Text>
        <Text style={s.headerSub}>How was your care experience?</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* Caregiver card */}
        <Card style={s.caregiverCard}>
          <Avatar uri={booking.caregiver_avatar} name={booking.caregiver_name} size={60} ring />
          <Text style={[TYPE.h3, { marginTop: 10 }]}>{booking.caregiver_name}</Text>
          <Text style={[TYPE.caption, { marginTop: 4, textTransform: 'capitalize' }]}>
            {booking.care_type?.replace('_', ' ')} Care
          </Text>
        </Card>

        {/* Star rating */}
        <Card>
          <Text style={s.sectionTitle}>Your Rating</Text>
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setScore(i)} activeOpacity={0.7}>
                <Text style={[s.star, i <= score && s.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.scoreChip}>
            <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.scoreGrad}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                {score}/5 — {LABELS[score]}
              </Text>
            </LinearGradient>
          </View>
        </Card>

        {/* Comment */}
        <Card>
          <Text style={s.sectionTitle}>Share Your Experience</Text>
          <Input
            placeholder="What did you appreciate most? Any suggestions for improvement?"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            style={{ textAlignVertical: 'top', minHeight: 100 }}
          />
        </Card>

        <Button title="Submit Review" onPress={submit} loading={loading} />
        <Button title="Skip" variant="ghost" onPress={() => navigation.navigate('PatientTabs', { screen: 'Bookings' })}
          style={{ marginTop: 10, marginBottom: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  body:         { padding: 16, gap: 0 },
  caregiverCard:{ alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 16 },
  starRow:      { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  star:         { fontSize: 44, color: C.borderLight },
  starActive:   { color: '#F59E0B' },
  scoreChip:    { borderRadius: RADIUS.pill, overflow: 'hidden', alignSelf: 'center' },
  scoreGrad:    { paddingHorizontal: 20, paddingVertical: 8 },
});
