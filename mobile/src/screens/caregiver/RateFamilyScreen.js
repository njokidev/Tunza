import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ratingApi } from '../../api';
import { Avatar, Button, Card, Chip, Input, ScreenHeader } from '../../components/ui';
import { COLORS as C, SHADOWS, TYPE } from '../../theme';
import { errorMessage, fmtDate } from '../../lib/format';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const QUICK = ['Respectful', 'Clear instructions', 'Safe home', 'On time', 'Would work again'];

/**
 * Caregiver rates the family after a completed visit. Other caregivers see the
 * family's average on new requests; families don't see individual ratings.
 */
export default function RateFamilyScreen({ route, navigation }) {
  const { booking: b } = route.params;
  const [score, setScore] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const text = [tags.join(', '), comment.trim()].filter(Boolean).join('. ');
      await ratingApi.rateFamily({ booking: b.id, score, comment: text });
      Alert.alert('Thank you', 'Your rating helps other caregivers know what to expect.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Could not save rating', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Rate the family" onBack={() => navigation.goBack()}
          subtitle="Only Tunza and other caregivers see the average. The family doesn't see your rating." />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Card style={st.who}>
            <Avatar uri={b.patient?.avatar} name={b.patient?.full_name} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={TYPE.h4}>{b.patient?.full_name}</Text>
              <Text style={TYPE.caption}>Visit on {fmtDate(b.end_date)}</Text>
            </View>
          </Card>
          <Card style={{ alignItems: 'center' }}>
            <View style={st.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setScore(n)} hitSlop={6} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                  <Feather name="star" size={36} color={n <= score ? C.star : C.border} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[TYPE.h4, { marginTop: 8 }]}>{LABELS[score]}</Text>
          </Card>
          <Card>
            <Text style={[TYPE.label, { marginBottom: 10 }]}>What stood out?</Text>
            <View style={st.wrap}>
              {QUICK.map((t) => (
                <Chip key={t} label={t} active={tags.includes(t)}
                  onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
              ))}
            </View>
            <Input label="Anything else? (optional)" multiline value={comment} onChangeText={setComment}
              placeholder="Anything Tunza should know about this home…" containerStyle={{ marginTop: 16, marginBottom: 0 }} />
          </Card>
        </View>
      </ScrollView>
      <View style={st.bar}><Button title="Submit rating" iconName="check" onPress={submit} loading={busy} /></View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  who:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stars: { flexDirection: 'row', gap: 10 },
  wrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bar:   { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
