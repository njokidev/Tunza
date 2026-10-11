
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { caregiverApi } from '../../api';
import { Input, Button, Card, LoadingScreen } from '../../components/ui';
import {
  COLORS as C,
  GRADIENT,
  RADIUS,
  TYPE,
} from '../../theme';

const EXP = [
  { key: 'junior', label: 'Junior', sub: '0–2 yrs' },
  { key: 'mid', label: 'Mid', sub: '2–5 yrs' },
  { key: 'senior', label: 'Senior', sub: '5+ yrs' },
];

const INITIAL_FORM = {
  bio: '',
  hourly_rate: '',
  years_exp: '',
  experience: 'junior',
  location_name: '',
  is_available: true,
  specialization_ids: [],
};

const getList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return 'Could not complete the request. Check your connection and try again.';
  }

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(', ')
          : typeof messages === 'string'
            ? messages
            : JSON.stringify(messages);

        return `${field.replaceAll('_', ' ')}: ${message}`;
      })
      .join('\n');
  }

  return 'Something went wrong. Please try again.';
};

const normalizeSpecializationIds = (profile) => {
  const values =
    profile?.specializations ??
    profile?.specialization_ids ??
    [];

  if (!Array.isArray(values)) return [];

  return values.map((item) =>
    typeof item === 'object' && item !== null
      ? item.id
      : item
  ).filter((id) => id !== null && id !== undefined);
};

export default function CaregiverProfileScreen() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = useCallback((key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const [profileResult, specsResult] = await Promise.allSettled([
        caregiverApi.myProfile(),
        caregiverApi.specializations(),
      ]);

      if (specsResult.status === 'fulfilled') {
        setSpecs(getList(specsResult.value));
      } else {
        setSpecs([]);
        console.warn(
          'Could not load specializations:',
          specsResult.reason
        );
      }

      if (profileResult.status === 'rejected') {
        throw profileResult.reason;
      }

      const profile = profileResult.value?.data ?? {};

      setForm({
        bio: profile.bio ?? '',
        hourly_rate:
          profile.hourly_rate != null
            ? String(profile.hourly_rate)
            : '',
        years_exp:
          profile.years_exp != null
            ? String(profile.years_exp)
            : '',
        experience: profile.experience ?? 'junior',
        location_name: profile.location_name ?? '',
        is_available: profile.is_available ?? true,
        specialization_ids: normalizeSpecializationIds(profile),
      });
    } catch (error) {
      console.error('Profile loading failed:', error);

      Alert.alert(
        'Could not load profile',
        getErrorMessage(error),
        [
          { text: 'Retry', onPress: loadProfile },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const toggleSpec = useCallback((id) => {
    setForm((previous) => {
      const current = previous.specialization_ids ?? [];

      const alreadySelected = current.some(
        (selectedId) => String(selectedId) === String(id)
      );

      return {
        ...previous,
        specialization_ids: alreadySelected
          ? current.filter(
              (selectedId) => String(selectedId) !== String(id)
            )
          : [...current, id],
      };
    });
  }, []);

  const validateForm = () => {
    const rateText = String(form.hourly_rate).trim();
    const yearsText = String(form.years_exp).trim();

    if (!rateText) {
      return 'Please enter your hourly rate in KES.';
    }

    const rate = Number(rateText);

    if (!Number.isFinite(rate) || rate <= 0) {
      return 'Hourly rate must be a valid number greater than zero.';
    }

    if (!yearsText) {
      return 'Please enter your years of experience.';
    }

    const years = Number(yearsText);

    if (
      !Number.isInteger(years) ||
      years < 0 ||
      years > 100
    ) {
      return 'Years of experience must be a whole number between 0 and 100.';
    }

    if (!form.location_name.trim()) {
      return 'Please enter your service location.';
    }

    if (!EXP.some((item) => item.key === form.experience)) {
      return 'Please select a valid experience level.';
    }

    return null;
  };

  const save = async () => {
    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      Alert.alert('Check your profile', validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        bio: form.bio.trim(),
        location_name: form.location_name.trim(),
        hourly_rate: Number(form.hourly_rate),
        years_exp: Number(form.years_exp),
        specialization_ids: form.specialization_ids,
        is_available: Boolean(form.is_available),
      };

      await caregiverApi.updateMyProfile(payload);

      Alert.alert(
        'Profile updated',
        'Your changes have been saved successfully.'
      );
    } catch (error) {
      console.error('Profile save failed:', error);

      Alert.alert(
        'Could not save profile',
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENT.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Text style={s.headerTitle}>Edit Profile</Text>
        <Text style={s.headerSub}>
          Keep your profile updated to get more bookings.
        </Text>
      </LinearGradient>

      <View style={s.content}>
        {/* Basic information */}
        <Card>
          <Text style={s.sectionTitle}>Basic Information</Text>

          <Input
            label="Bio / About Me"
            placeholder="Describe your experience and approach to care..."
            value={form.bio}
            onChangeText={(value) => set('bio', value)}
            multiline
            numberOfLines={4}
            style={s.bioInput}
          />

          <Input
            label="Hourly Rate (KES)"
            placeholder="e.g. 500"
            value={form.hourly_rate}
            onChangeText={(value) => set('hourly_rate', value)}
            keyboardType="decimal-pad"
            icon="💰"
          />

          <Input
            label="Years of Experience"
            placeholder="e.g. 3"
            value={form.years_exp}
            onChangeText={(value) => set('years_exp', value)}
            keyboardType="number-pad"
            icon="📅"
          />

          <Input
            label="Location / Area"
            placeholder="e.g. Westlands, Nairobi"
            value={form.location_name}
            onChangeText={(value) => set('location_name', value)}
            icon="📍"
          />
        </Card>

        {/* Experience level */}
        <Card>
          <Text style={s.sectionTitle}>Experience Level</Text>

          <View style={s.expRow}>
            {EXP.map((item) => {
              const active = form.experience === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    s.expChip,
                    active && s.expChipActive,
                  ]}
                  onPress={() => set('experience', item.key)}
                >
                  <Text
                    style={[
                      s.expTitle,
                      active && s.activeText,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Text style={s.expSub}>{item.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Specializations */}
        <Card>
          <Text style={s.sectionTitle}>Specializations</Text>

          {specs.length === 0 ? (
            <Text style={TYPE.body}>
              Specializations could not be loaded. You can still
              update the rest of your profile.
            </Text>
          ) : (
            <>
              <Text style={s.helperText}>
                Select all the types of care you are qualified to provide.
              </Text>

              <View style={s.specGrid}>
                {specs.map((specialization) => {
                  const selected = (
                    form.specialization_ids ?? []
                  ).some(
                    (id) =>
                      String(id) === String(specialization.id)
                  );

                  return (
                    <TouchableOpacity
                      key={String(specialization.id)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      style={[
                        s.specChip,
                        selected && s.specChipActive,
                      ]}
                      onPress={() => toggleSpec(specialization.id)}
                    >
                      {selected && (
                        <Text style={s.checkmark}>✓</Text>
                      )}

                      <Text
                        style={[
                          s.specTxt,
                          selected && s.activeText,
                        ]}
                      >
                        {specialization.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </Card>

        {/* Availability */}
        <Card>
          <View style={s.availabilityRow}>
            <View style={s.availabilityText}>
              <Text style={s.sectionTitle}>
                Available for Bookings
              </Text>

              <Text style={s.availabilitySub}>
                {form.is_available
                  ? 'Patients can find your profile in search.'
                  : 'Your profile will not appear in availability-based searches.'}
              </Text>
            </View>

            <Switch
              value={Boolean(form.is_available)}
              onValueChange={(value) => set('is_available', value)}
              trackColor={{
                true: C.primary,
                false: C.border,
              }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Available for bookings"
            />
          </View>
        </Card>

        <Button
          title="Save Profile"
          onPress={save}
          loading={saving}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    lineHeight: 19,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  expRow: {
    flexDirection: 'row',
    gap: 10,
  },
  expChip: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
    padding: 12,
    alignItems: 'center',
  },
  expChipActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryXLight,
  },
  expTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: C.textMuted,
  },
  activeText: {
    color: C.primary,
  },
  expSub: {
    fontSize: 11,
    color: C.textFaint,
    marginTop: 3,
  },
  helperText: {
    ...TYPE.caption,
    marginBottom: 12,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  specChipActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryXLight,
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
    marginRight: 5,
  },
  specTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  availabilityText: {
    flex: 1,
  },
  availabilitySub: {
    ...TYPE.caption,
    lineHeight: 18,
  },
});
