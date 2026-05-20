import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ratingApi } from '../../api';
import { Card, Input, Button, Avatar, COLORS } from '../../components/ui';

export default function ReviewScreen({ route, navigation }) {
  const { booking }             = route.params;
  const [score,   setScore]     = useState(5);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);
  const caregiver               = booking.caregiver;

  const submit = async () => {
    setLoading(true);
    try {
      await ratingApi.create({
        caregiver: caregiver.id,
        booking:   booking.id,
        score,
        comment,
      });
      Alert.alert('Thank you! ⭐', 'Your review has been submitted.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave a Review</Text>

      <Card style={{ alignItems: 'center', marginBottom: 24 }}>
        <Avatar uri={caregiver?.user?.avatar} name={caregiver?.user?.full_name} size={64} />
        <Text style={styles.name}>{caregiver?.user?.full_name}</Text>
        <Text style={styles.sub}>{booking.care_type}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Rating</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setScore(i)}>
              <Text style={[styles.star, i <= score && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.scoreLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][score]}
        </Text>

        <Input
          label="Comment (optional)"
          placeholder="Share your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          style={{ marginTop: 8 }}
        />

        <Button title="Submit Review" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 60 },
  title:      { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  name:       { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  sub:        { fontSize: 13, color: COLORS.muted, marginTop: 4, textTransform: 'capitalize' },
  label:      { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  starRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  star:       { fontSize: 40, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
});
