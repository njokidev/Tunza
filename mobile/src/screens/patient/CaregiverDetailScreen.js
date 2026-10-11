
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ratingApi, bookingApi } from '../../api';
import {
  Avatar,
  Stars,
  Badge,
  Button,
  Input,
  Card,
  LoadingScreen,
} from '../../components/ui';
import {
  COLORS as C,
  GRADIENT,
  RADIUS,
  SHADOWS,
  TYPE,
  SPACING,
} from '../../theme';

const CARE_TYPES = [
  { key: 'palliative', label: '🕊 Palliative' },
  { key: 'longterm', label: '🏠 Long-term' },
  { key: 'daycare', label: '☀ Day Care' },
  { key: 'overnight', label: '🌙 Overnight' },
  { key: 'postop', label: '🏥 Post-op' },
];

const INITIAL_FORM = {
  care_type: 'palliative',
  scheduled_start: '',
  scheduled_end: '',
  address: '',
  special_needs: '',
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return 'Could not complete your request. Check your connection and try again.';
  }

  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;

  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => {
        const value = Array.isArray(messages)
          ? messages.join(', ')
          : typeof messages === 'string'
            ? messages
            : JSON.stringify(messages);

        return `${field.replaceAll('_', ' ')}: ${value}`;
      })
      .join('\n');
  }

  return 'Something went wrong. Please try again.';
};

const getReviews = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

// Accepts YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm.
// Interprets the date/time as the user's local time.
const parseLocalDateTime = (value) => {
  const normalized = value.trim().replace(' ', 'T');
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );

  // Reject invalid calendar dates such as February 30.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return 'To be confirmed';

  return amount.toLocaleString('en-KE', {
    maximumFractionDigits: 2,
  });
};

export default function CaregiverDetailScreen({ route, navigation }) {
  const caregiver = route?.params?.caregiver;

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const set = useCallback((key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      if (!caregiver?.id) {
        setReviewsLoading(false);
        return;
      }

      try {
        const response = await ratingApi.list(caregiver.id);

        if (active) {
          setReviews(getReviews(response));
        }
      } catch (error) {
        console.warn('Could not load caregiver reviews:', error);
      } finally {
        if (active) setReviewsLoading(false);
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, [caregiver?.id]);

  const closeBooking = () => {
    if (submitting) return;

    setBooking(false);
  };

  const validateBooking = () => {
    if (!caregiver?.id) {
      return 'Caregiver information is missing. Please return to the caregiver list and try again.';
    }

    if (!caregiver.is_available) {
      return 'This caregiver is currently unavailable. Please choose another caregiver.';
    }

    if (!form.scheduled_start.trim()) {
      return 'Please enter the booking start date and time.';
    }

    if (!form.scheduled_end.trim()) {
      return 'Please enter the booking end date and time.';
    }

    if (!form.address.trim()) {
      return 'Please enter the address where care is needed.';
    }

    const start = parseLocalDateTime(form.scheduled_start);
    const end = parseLocalDateTime(form.scheduled_end);

    if (!start) {
      return 'Enter a valid start date and time using YYYY-MM-DD HH:mm, for example 2026-12-01 09:00.';
    }

    if (!end) {
      return 'Enter a valid end date and time using YYYY-MM-DD HH:mm, for example 2026-12-01 17:00.';
    }

    if (start <= new Date()) {
      return 'The booking start time must be in the future.';
    }

    if (end <= start) {
      return 'The booking end time must be after the start time.';
    }

    return null;
  };

  const handleBook = async () => {
    if (submitting) return;

    const validationError = validateBooking();

    if (validationError) {
      Alert.alert('Check your booking', validationError);
      return;
    }

    const start = parseLocalDateTime(form.scheduled_start);
    const end = parseLocalDateTime(form.scheduled_end);

    setSubmitting(true);

    try {
      const response = await bookingApi.create({
        caregiver_id: caregiver.id,
        care_type: form.care_type,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        address: form.address.trim(),
        special_needs: form.special_needs.trim(),
      });

      const data = response?.data ?? {};
      const caregiverName =
        caregiver.user?.full_name || 'your selected caregiver';

      setBooking(false);
      setForm(INITIAL_FORM);

      const estimate =
        data.estimated_amount != null
          ? `\n\nEstimated amount: KES ${formatMoney(data.estimated_amount)}`
          : '';

      Alert.alert(
        'Booking request sent',
        `Your request has been sent to ${caregiverName}.${estimate}`,
        [
          {
            text: 'View Bookings',
            onPress: () => navigation.navigate('Bookings'),
          },
          {
            text: 'Done',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Booking request failed:', error);

      Alert.alert(
        'Booking failed',
        getErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!caregiver) {
    return (
      <View style={s.errorScreen}>
        <Text style={TYPE.h4}>Caregiver not found</Text>
        <Text style={s.errorText}>
          We could not load this caregiver's information.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const caregiverName =
    caregiver.user?.full_name || 'Caregiver';

  const rating = Number(caregiver.rating_avg) || 0;
  const ratingCount = Number(caregiver.rating_count) || 0;
  const rate = caregiver.hourly_rate;

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile header */}
        <LinearGradient
          colors={GRADIENT.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>

          <Avatar
            uri={caregiver.user?.avatar}
            name={caregiverName}
            size={80}
            ring
          />

          <Text style={s.heroName}>{caregiverName}</Text>

          <View style={s.badgeRow}>
            <Badge
              label={caregiver.is_available ? 'Available' : 'Busy'}
            />
            {caregiver.experience ? (
              <Badge label={caregiver.experience} />
            ) : null}
          </View>

          <View style={s.ratingRow}>
            <Stars score={rating} size={16} />
            <Text style={s.ratingText}>
              {rating.toFixed(1)} · {ratingCount} reviews
            </Text>
          </View>
        </LinearGradient>

        <View style={s.content}>
          {/* Hourly rate */}
          <View style={s.rateCard}>
            <LinearGradient
              colors={['#F5F3FF', '#EDE9FE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.rateInner}
            >
              <View>
                <Text style={TYPE.caption}>Hourly Rate</Text>
                <Text style={s.rateAmount}>
                  {rate != null
                    ? `KES ${formatMoney(rate)}`
                    : 'Rate not provided'}
                </Text>
              </View>
              <Text style={s.moneyIcon}>💰</Text>
            </LinearGradient>
          </View>

          {/* About */}
          {caregiver.bio ? (
            <Card>
              <Text style={s.sectionTitle}>About</Text>
              <Text style={s.bodyText}>{caregiver.bio}</Text>
            </Card>
          ) : null}

          {/* Specializations */}
          {Array.isArray(caregiver.specializations) &&
          caregiver.specializations.length > 0 ? (
            <Card>
              <Text style={s.sectionTitle}>
                🎓 Specializations
              </Text>

              <View style={s.tagWrap}>
                {caregiver.specializations.map((specialization) => (
                  <View
                    key={String(specialization.id ?? specialization.name)}
                    style={s.tag}
                  >
                    <Text style={s.tagText}>
                      {specialization.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Location and experience */}
          <Card>
            <Text style={s.sectionTitle}>📍 Details</Text>

            {caregiver.location_name ? (
              <View style={s.detailRow}>
                <Text style={TYPE.caption}>Location</Text>
                <Text style={TYPE.h4}>
                  {caregiver.location_name}
                </Text>
              </View>
            ) : null}

            <View style={s.detailRow}>
              <Text style={TYPE.caption}>Experience</Text>
              <Text style={TYPE.h4}>
                {caregiver.years_exp ?? 0} years
              </Text>
            </View>
          </Card>

          {/* Availability schedule */}
          {Array.isArray(caregiver.availability) &&
          caregiver.availability.length > 0 ? (
            <Card>
              <Text style={s.sectionTitle}>🗓 Schedule</Text>

              {caregiver.availability.map((item, index) => (
                <View
                  key={String(item.id ?? index)}
                  style={s.availabilityRow}
                >
                  <Text style={[TYPE.h4, s.flexOne]}>
                    {item.day_display || item.day || 'Available'}
                  </Text>
                  <Text style={TYPE.body}>
                    {item.start_time} – {item.end_time}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Reviews */}
          <Card>
            <Text style={s.sectionTitle}>⭐ Reviews</Text>

            {reviewsLoading ? (
              <Text style={s.bodyText}>
                Loading reviews...
              </Text>
            ) : reviews.length === 0 ? (
              <Text style={s.bodyText}>
                No reviews yet.
              </Text>
            ) : (
              reviews.slice(0, 3).map((review) => (
                <View key={String(review.id)} style={s.reviewItem}>
                  <View style={s.reviewHeader}>
                    <Text style={TYPE.h4}>
                      {review.patient?.full_name || 'Family'}
                    </Text>
                    <Stars score={Number(review.score) || 0} size={12} />
                  </View>

                  {review.comment ? (
                    <Text style={s.reviewComment}>
                      {review.comment}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>

          {/* Actions */}
          <Button
            title="💬 Message"
            variant="outline"
            onPress={() => {
              if (!caregiver.user?.id) {
                Alert.alert(
                  'Unavailable',
                  'Messaging details are not available for this caregiver.'
                );
                return;
              }

              navigation.navigate('Chat', {
                otherUserId: caregiver.user.id,
                otherName: caregiverName,
              });
            }}
          />

          {caregiver.is_available ? (
            <Button
              title="📅 Book this Caregiver"
              onPress={() => setBooking(true)}
            />
          ) : (
            <Text style={s.unavailableText}>
              This caregiver is not currently accepting booking requests.
            </Text>
          )}

          <View style={s.bottomSpace} />
        </View>
      </ScrollView>

      {/* Booking modal */}
      <Modal
        visible={booking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeBooking}
      >
        <KeyboardAvoidingView
          style={s.modalScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <LinearGradient
            colors={GRADIENT.primary}
            style={s.modalHeader}
          >
            <View style={s.modalHeaderRow}>
              <View style={s.flexOne}>
                <Text style={s.modalTitle}>
                  Request Care
                </Text>
                <Text style={s.modalSubtitle}>
                  {caregiverName}
                </Text>
                <Text style={s.modalSubtitle}>
                  {rate != null
                    ? `KES ${formatMoney(rate)}/hr`
                    : 'Rate to be confirmed'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeBooking}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Close booking form"
                style={s.closeBtn}
              >
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView
            style={s.modalScroll}
            contentContainerStyle={s.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.modalSectionTitle}>Type of Care</Text>

            <View style={s.typeGrid}>
              {CARE_TYPES.map((type) => {
                const selected = form.care_type === type.key;

                return (
                  <TouchableOpacity
                    key={type.key}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      s.typeChip,
                      selected && s.typeChipActive,
                    ]}
                    onPress={() => set('care_type', type.key)}
                  >
                    <Text
                      style={[
                        s.typeChipText,
                        selected && s.typeChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.dateHint}>
              Use 24-hour local time: YYYY-MM-DD HH:mm
            </Text>

            <Input
              label="Start Date & Time *"
              placeholder="2026-12-01 09:00"
              value={form.scheduled_start}
              onChangeText={(value) => set('scheduled_start', value)}
            />

            <Input
              label="End Date & Time *"
              placeholder="2026-12-01 17:00"
              value={form.scheduled_end}
              onChangeText={(value) => set('scheduled_end', value)}
            />

            <Input
              label="Service Address *"
              placeholder="Area, street, building, Nairobi"
              value={form.address}
              onChangeText={(value) => set('address', value)}
            />

            <Input
              label="Special Needs / Notes"
              placeholder="Describe care needs or important instructions..."
              value={form.special_needs}
              onChangeText={(value) => set('special_needs', value)}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Send Booking Request"
              onPress={handleBook}
              loading={submitting}
              style={s.submitButton}
            />

            <Button
              title="Cancel"
              variant="outline"
              onPress={closeBooking}
              loading={false}
              style={s.cancelButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: C.bg,
  },
  errorText: {
    ...TYPE.body,
    color: C.textMuted,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 6,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  rateCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  rateInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  rateAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: C.primary,
    marginTop: 4,
  },
  moneyIcon: {
    fontSize: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  bodyText: {
    ...TYPE.body,
    color: C.textMuted,
    lineHeight: 22,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  tagText: {
    fontSize: 12,
    color: C.primaryDark,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  flexOne: {
    flex: 1,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reviewComment: {
    ...TYPE.body,
    color: C.textMuted,
    marginTop: 4,
  },
  unavailableText: {
    ...TYPE.body,
    textAlign: 'center',
    color: C.textMuted,
    paddingVertical: 12,
  },
  bottomSpace: {
    height: 20,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalSectionTitle: {
    ...TYPE.h4,
    marginBottom: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  typeChipActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryXLight,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  typeChipTextActive: {
    color: C.primary,
  },
  dateHint: {
    ...TYPE.caption,
    marginBottom: 2,
  },
  submitButton: {
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 2,
  },
});
