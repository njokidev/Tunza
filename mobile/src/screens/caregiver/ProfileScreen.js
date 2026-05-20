import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Switch,
} from 'react-native';
import { caregiverApi } from '../../api';
import { Card, Input, Button, COLORS, LoadingScreen } from '../../components/ui';

export default function CaregiverProfileScreen() {
  const [profile,  setProfile]  = useState(null);
  const [form,     setForm]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [specs,    setSpecs]    = useState([]);

  useEffect(() => {
    Promise.all([caregiverApi.myProfile(), caregiverApi.specializations()])
      .then(([pRes, sRes]) => {
        setProfile(pRes.data);
        setSpecs(sRes.data.results || sRes.data);
        setForm({
          bio:           pRes.data.bio || '',
          hourly_rate:   String(pRes.data.hourly_rate || ''),
          years_exp:     String(pRes.data.years_exp   || ''),
          experience:    pRes.data.experience   || 'junior',
          location_name: pRes.data.location_name || '',
          is_available:  pRes.data.is_available,
          specialization_ids: pRes.data.specializations?.map(s => s.id) || [],
        });
      })
      .catch(() => Alert.alert('Error', 'Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleSpec = (id) => {
    const current = form.specialization_ids || [];
    const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    set('specialization_ids', updated);
  };

  const save = async () => {
    setSaving(true);
    try {
      await caregiverApi.updateMyProfile({
        ...form,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        years_exp:   parseInt(form.years_exp)     || 0,
      });
      Alert.alert('Saved! ✅', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', JSON.stringify(err.response?.data) || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const EXP_LEVELS = [
    { key: 'junior', label: 'Junior (0-2 yrs)' },
    { key: 'mid',    label: 'Mid (2-5 yrs)' },
    { key: 'senior', label: 'Senior (5+ yrs)' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 60 }}>
      <Text style={styles.title}>My Profile</Text>

      <Card>
        <Text style={styles.sectionTitle}>Basic Info</Text>
        <Input label="Bio / About me" placeholder="Describe your experience and approach to care..." value={form.bio} onChangeText={v => set('bio', v)} multiline numberOfLines={4} />
        <Input label="Hourly Rate (KES)" placeholder="500" value={form.hourly_rate} onChangeText={v => set('hourly_rate', v)} keyboardType="numeric" />
        <Input label="Years of Experience" placeholder="3" value={form.years_exp} onChangeText={v => set('years_exp', v)} keyboardType="numeric" />
        <Input label="Location / Area" placeholder="Westlands, Nairobi" value={form.location_name} onChangeText={v => set('location_name', v)} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        <View style={styles.chipRow}>
          {EXP_LEVELS.map(e => (
            <Button
              key={e.key}
              title={e.label}
              variant={form.experience === e.key ? 'primary' : 'outline'}
              onPress={() => set('experience', e.key)}
              style={styles.expChip}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Specializations</Text>
        <View style={styles.chipRow}>
          {specs.map(s => {
            const selected = form.specialization_ids?.includes(s.id);
            return (
              <Button
                key={s.id}
                title={s.name}
                variant={selected ? 'primary' : 'outline'}
                onPress={() => toggleSpec(s.id)}
                style={styles.specChip}
              />
            );
          })}
          {specs.length === 0 && (
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>No specializations added by admin yet.</Text>
          )}
        </View>
      </Card>

      <Card>
        <View style={styles.availRow}>
          <Text style={styles.sectionTitle}>Available for bookings</Text>
          <Switch
            value={form.is_available}
            onValueChange={v => set('is_available', v)}
            trackColor={{ true: COLORS.success }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Button title="Save Profile" onPress={save} loading={saving} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expChip:      { flex: 0, paddingVertical: 8, paddingHorizontal: 14 },
  specChip:     { flex: 0, paddingVertical: 8, paddingHorizontal: 12 },
  availRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
