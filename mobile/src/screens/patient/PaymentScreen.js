import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { paymentApi } from '../../api';
import { Card, Input, Button, COLORS } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function PaymentScreen({ route, navigation }) {
  const { booking }          = route.params;
  const { user }             = useAuth();
  const [phone,    setPhone] = useState(user?.phone || '');
  const [loading,  setLoading]  = useState(false);
  const [polling,  setPolling]  = useState(false);
  const [status,   setStatus]   = useState(null);

  // Poll for payment confirmation every 3 seconds
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await paymentApi.status(booking.id);
        if (data.status === 'success') {
          setStatus('success');
          setPolling(false);
          clearInterval(interval);
          Alert.alert('Payment Successful! 🎉', `Receipt: ${data.mpesa_receipt}`, [
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else if (data.status === 'failed') {
          setStatus('failed');
          setPolling(false);
          clearInterval(interval);
          Alert.alert('Payment Failed', 'The M-Pesa payment was not completed. Please try again.');
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  const handlePay = async () => {
    const cleaned = phone.replace(/\D/g, '');
    let mpesaPhone = cleaned;
    if (cleaned.startsWith('0')) mpesaPhone = '254' + cleaned.slice(1);
    if (!mpesaPhone.startsWith('254') || mpesaPhone.length !== 12) {
      Alert.alert('Invalid phone', 'Enter a valid Safaricom number e.g. 0712345678');
      return;
    }

    setLoading(true);
    try {
      await paymentApi.initiate({ booking_id: booking.id, phone: mpesaPhone });
      setLoading(false);
      setPolling(true);
      Alert.alert(
        'Check your phone 📱',
        'An M-Pesa prompt has been sent. Enter your PIN to complete payment.',
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.response?.data?.detail || 'Could not initiate payment.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Payment</Text>

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.label}>Booking Summary</Text>
        <Text style={styles.infoRow}>👤 Caregiver: {booking.caregiver?.user?.full_name}</Text>
        <Text style={styles.infoRow}>🏥 Care Type: {booking.care_type}</Text>
        <Text style={styles.infoRow}>📅 {new Date(booking.start_date).toLocaleDateString()} → {new Date(booking.end_date).toLocaleDateString()}</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>KES {booking.total_amount}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>M-Pesa Payment</Text>
        <Text style={styles.mpesaNote}>
          Enter the M-Pesa registered phone number. You'll receive an STK push prompt.
        </Text>
        <Input
          label="M-Pesa Phone Number"
          placeholder="0712 345 678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {polling ? (
          <View style={styles.pollingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.pollingText}>Waiting for M-Pesa confirmation...</Text>
          </View>
        ) : (
          <Button
            title={`Pay KES ${booking.total_amount} via M-Pesa`}
            onPress={handlePay}
            loading={loading}
          />
        )}
      </Card>

      <Text style={styles.disclaimer}>
        🔒 Payments are processed securely via Safaricom M-Pesa. Tunza never stores your PIN.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 60 },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  label:        { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  infoRow:      { fontSize: 14, color: COLORS.muted, marginBottom: 6 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel:   { fontSize: 16, fontWeight: '600', color: COLORS.text },
  totalAmount:  { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  mpesaNote:    { fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 18 },
  pollingBox:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, backgroundColor: '#EFF6FF', borderRadius: 12 },
  pollingText:  { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  disclaimer:   { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
