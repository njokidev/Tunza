import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { caregiverApi } from '../../../api';
import { Button, Card, Notice, ScreenHeader } from '../../../components/ui';
import WeekAvailability, { slotsFromWeek, weekFromSlots } from '../../../components/WeekAvailability';
import { useAuth } from '../../../context/AuthContext';
import { errorMessage } from '../../../lib/format';
import { COLORS as C, TYPE } from '../../../theme';
import SetupFooter from './SetupFooter';

/** Caregiver setup, step 3 of 3: the days and hours they usually work. */
export default function SetupAvailabilityScreen() {
  const { refreshUser } = useAuth();
  const [week, setWeek] = useState(() => weekFromSlots([]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const chosen = week.filter((d) => d.on).length;

  const save = async () => {
    if (!chosen) { setError('Choose at least one day you can work.'); return; }
    setSaving(true);
    setError('');
    try {
      await caregiverApi.saveAvailability(slotsFromWeek(week));
      await refreshUser();   // setup done: the app opens
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenHeader eyebrow="STEP 3 OF 3" title="When can you work?"
          subtitle="Pick your days, then your usual hours. Families are matched to the times you choose." />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Card>
            <WeekAvailability week={week} onChange={(w) => { setWeek(w); setError(''); }} bare />
          </Card>
          <Text style={[TYPE.caption, { textAlign: 'center' }]}>You can change this any time from your profile.</Text>
          {error ? <Notice>{error}</Notice> : null}
          <SetupFooter />
        </View>
      </ScrollView>
      <View style={st.bar}>
        <Button title="Finish setup" iconName="check" onPress={save} loading={saving} disabled={saving}
          variant={chosen ? 'primary' : 'secondary'} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.borderLight },
});
