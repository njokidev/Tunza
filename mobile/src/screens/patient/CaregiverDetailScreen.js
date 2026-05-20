import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal,
} from 'react-native';
import { ratingApi, bookingApi } from '../../api';
import {
  Avatar, Stars, Badge, Button, Input, Card, COLORS, LoadingScreen,
} from '../../components/ui';

const CARE_TYPES = [
  { key: 'palliative', label: '🕊️ Palliative Care' },
  { key: 'longterm',   label: '🏠 Long-term Care' },
  { key: 'daycare',    label: '☀️ Day Care' },
  { key: 'overnight',  label: '🌙 Overnight Care' },
  { key: 'postop',     label: '🏥 Post-operative' },
];

export default function CaregiverDetailScreen({ route, navigation }) {
  const { caregiver }            = route.params;
  const [reviews,  setReviews]   = useState([]);
  const [booking,  setBooking]   = useState(false);   // show booking modal
  const [loading,  setLoading]   = useState(false);
  const [form,     setForm]      = useState({
    care_type: 'palliative', start_date: '', end_date: '',
    address: '', special_needs: '',
  });

  useEffect(() => {
    ratingApi.list(caregiver.id).then(r => setReviews(r.data.results || r.data)).catch(() => {});
  }, [caregiver.id]);

  const handleBook = async () => {
    if (!form.start_date || !form.end_date || !form.address) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await bookingApi.create({
        caregiver_id:  caregiver.id,
        care_type:     form.care_type,
        start_date:    new Date(form.start_date).toISOString(),
        end_date:      new Date(form.end_date).toISOString(),
        address:       form.address,
        special_needs: form.special_needs,
      });
      setBooking(false);
      Alert.alert(
        'Booking Sent! ✅',
        `Request sent to ${caregiver.user?.full_name}.\nEstimated cost: KES ${data.total_amount}`,
        [{ text: 'View Bookings', onPress: () => navigation.navigate('Bookings') }]
      );
    } catch (err) {
      const msg = err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join('\n') || 'Booking failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView>
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar uri={caregiver.user?.avatar} name={caregiver.user?.full_name} size={80} />
          <Text style={styles.name}>{caregiver.user?.full_name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Badge label={caregiver.is_available ? 'Available' : 'Busy'} />
            <Badge label={caregiver.experience} />
          </View>
          <Stars score={Math.round(caregiver.rating_avg)} size={20} />
          <Text style={styles.ratingText}>{caregiver.rating_avg} · {caregiver.rating_count} reviews · {caregiver.years_exp} yrs exp</Text>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {/* Rate */}
          <Card>
            <Text style={styles.sectionTitle}>💰 Hourly Rate</Text>
            <Text style={styles.rate}>KES {caregiver.hourly_rate} / hour</Text>
          </Card>

          {/* Bio */}
          {caregiver.bio && (
            <Card>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{caregiver.bio}</Text>
            </Card>
          )}

          {/* Specializations */}
          {caregiver.specializations?.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>🎓 Specializations</Text>
              <View style={styles.tags}>
                {caregiver.specializations.map(s => (
                  <View key={s.id} style={styles.tag}>
                    <Text style={styles.tagText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Location */}
          {caregiver.location_name && (
            <Card>
              <Text style={styles.sectionTitle}>📍 Location</Text>
              <Text style={styles.bio}>{caregiver.location_name}</Text>
            </Card>
          )}

          {/* Availability */}
          {caregiver.availability?.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>🗓 Availability</Text>
              {caregiver.availability.map(a => (
                <Text key={a.id} style={styles.availRow}>
                  {a.day_display}: {a.start_time} – {a.end_time}
                </Text>
              ))}
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <Text style={styles.sectionTitle}>⭐ Reviews</Text>
            {reviews.length === 0 && <Text style={styles.bio}>No reviews yet.</Text>}
            {reviews.slice(0, 3).map(r => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.reviewAuthor}>{r.patient?.full_name}</Text>
                  <Stars score={r.score} size={12} />
                </View>
                {r.comment && <Text style={styles.bio}>{r.comment}</Text>}
              </View>
            ))}
          </Card>

          {/* Message button */}
          <Button
            title="💬 Send a Message"
            variant="outline"
            onPress={() => navigation.navigate('Chat', { otherUserId: caregiver.user?.id, otherName: caregiver.user?.full_name })}
          />

          {/* Book button */}
          {caregiver.is_available && (
            <Button title="📅 Book this Caregiver" onPress={() => setBooking(true)} />
          )}
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={booking} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Book {caregiver.user?.full_name}</Text>

          <Text style={styles.label}>Care Type</Text>
          <View style={styles.typeGrid}>
            {CARE_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, form.care_type === t.key && styles.typeCardActive]}
                onPress={() => set('care_type', t.key)}
              >
                <Text style={[styles.typeLabel, form.care_type === t.key && { color: COLORS.primary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Start Date & Time *" placeholder="2025-12-01 09:00" value={form.start_date} onChangeText={v => set('start_date', v)} />
          <Input label="End Date & Time *"   placeholder="2025-12-03 17:00" value={form.end_date}   onChangeText={v => set('end_date', v)} />
          <Input label="Service Address *"   placeholder="123 Ngong Road, Nairobi" value={form.address} onChangeText={v => set('address', v)} />
          <Input label="Special Needs / Notes" placeholder="Any medical conditions, dietary requirements..." value={form.special_needs} onChangeText={v => set('special_needs', v)} multiline numberOfLines={3} />

          <Text style={styles.rateNote}>
            Rate: KES {caregiver.hourly_rate}/hr. Total calculated automatically.
          </Text>

          <Button title="Confirm Booking" onPress={handleBook} loading={loading} style={{ marginTop: 8 }} />
          <Button title="Cancel" variant="outline" onPress={() => setBooking(false)} style={{ marginTop: 10, marginBottom: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero:         { backgroundColor: COLORS.card, alignItems: 'center', padding: 28, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  name:         { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  ratingText:   { fontSize: 13, color: COLORS.muted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  rate:         { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  bio:          { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  tags:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:          { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  tagText:      { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  availRow:     { fontSize: 13, color: COLORS.text, paddingVertical: 4 },
  reviewItem:   { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 10 },
  reviewAuthor: { fontWeight: '700', color: COLORS.text, fontSize: 13 },
  modal:        { flex: 1, padding: 24, backgroundColor: COLORS.bg },
  modalTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 24, marginTop: 16 },
  label:        { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  typeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeCard:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  typeLabel:    { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  rateNote:     { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 8, textAlign: 'center' },
});
