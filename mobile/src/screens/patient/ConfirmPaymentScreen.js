import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingApi } from '../../api';
import { Button, Card, Avatar, COLORS } from '../../components/ui';
import { COLORS as C, GRADIENT, RADIUS, SHADOWS, TYPE, SPACING } from '../../theme';
import { format, differenceInMinutes } from 'date-fns';

export default function ConfirmPaymentScreen({ route, navigation }) {
  const { booking }          = route.params;
  const [loading, setLoading]= useState(false);

  const startTime = new Date(booking.actual_start || booking.scheduled_start);
  const endTime   = new Date(booking.actual_end   || booking.scheduled_end);
  const mins      = differenceInMinutes(endTime, startTime);
  const hours     = (mins / 60).toFixed(1);

  const handleConfirm = async () => {
    Alert.alert(
      'Confirm Payment',
      `Please ensure you have paid KES ${booking.final_amount} to ${booking.caregiver_name} before confirming.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Have Paid',
          onPress: async () => {
            setLoading(true);
            try {
              await bookingApi.confirmPayment(booking.id);
              Alert.alert(
                'Payment Confirmed 🎉',
                'Thank you! The session is now complete. Would you like to leave a review?',
                [
                  { text: 'Skip',    onPress: () => navigation.navigate('Bookings') },
                  { text: 'Review',  onPress: () => navigation.replace('Review', { booking }) },
                ]
              );
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not confirm payment.');
            } finally { setLoading(false); }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Gradient header */}
      <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Text style={s.headerTitle}>Payment Due</Text>
        <Text style={s.headerSub}>Please pay your caregiver to complete the session</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Caregiver info */}
        <Card style={s.profileCard}>
          <View style={{ alignItems: 'center' }}>
            <Avatar uri={booking.caregiver_avatar} name={booking.caregiver_name} size={64} ring />
            <Text style={[TYPE.h3, { marginTop: 12 }]}>{booking.caregiver_name}</Text>
            <Text style={[TYPE.caption, { marginTop: 4, textTransform: 'capitalize' }]}>
              {booking.care_type?.replace('_', ' ')} Care
            </Text>
          </View>
        </Card>

        {/* Session summary */}
        <Card>
          <Text style={s.sectionTitle}>Session Summary</Text>

          <View style={s.row}>
            <Text style={TYPE.caption}>Start time</Text>
            <Text style={TYPE.h4}>{format(startTime, 'dd MMM yyyy, HH:mm')}</Text>
          </View>
          <View style={s.row}>
            <Text style={TYPE.caption}>End time</Text>
            <Text style={TYPE.h4}>{format(endTime, 'dd MMM yyyy, HH:mm')}</Text>
          </View>
          <View style={s.row}>
            <Text style={TYPE.caption}>Duration</Text>
            <Text style={TYPE.h4}>{hours} hours ({mins} min)</Text>
          </View>
          <View style={s.row}>
            <Text style={TYPE.caption}>Rate</Text>
            <Text style={TYPE.h4}>KES {booking.caregiver_hourly_rate}/hr</Text>
          </View>
        </Card>

        {/* Amount to pay */}
        <View style={s.amountCard}>
          <LinearGradient colors={GRADIENT.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.amountGrad}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' }}>
                Total Amount Due
              </Text>
              <Text style={s.amountValue}>KES {booking.final_amount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4 }}>
                Pay cash or mobile money directly to your caregiver
              </Text>
            </View>
            <Text style={{ fontSize: 44 }}>💳</Text>
          </LinearGradient>
        </View>

        {/* How to pay instruction */}
        <Card style={s.instructCard}>
          <Text style={s.sectionTitle}>How to Pay</Text>
          {[
            { n: '1', t: 'Send KES ' + booking.final_amount + ' via M-Pesa to ' + booking.caregiver_name },
            { n: '2', t: 'Or pay cash directly to your caregiver' },
            { n: '3', t: 'Once paid, tap the button below to confirm' },
          ].map(step => (
            <View key={step.n} style={s.step}>
              <LinearGradient colors={GRADIENT.primary} style={s.stepNum}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{step.n}</Text>
              </LinearGradient>
              <Text style={[TYPE.body, { flex: 1, lineHeight: 20 }]}>{step.t}</Text>
            </View>
          ))}
        </Card>

        <Button
          title={`Confirm Payment of KES ${booking.final_amount}`}
          onPress={handleConfirm}
          loading={loading}
          style={{ marginBottom: 8 }}
        />
        <Button
          title="Pay Later"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginBottom: 40 }}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  body:         { padding: 16, paddingTop: 0, gap: 0 },
  profileCard:  { alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  amountCard:   { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 12, ...SHADOWS.md },
  amountGrad:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  amountValue:  { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 6 },
  instructCard: { marginBottom: 20 },
  step:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
