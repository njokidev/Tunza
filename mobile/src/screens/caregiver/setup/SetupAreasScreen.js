import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { caregiverApi } from '../../../api';
import { Button, Card, Notice, ScreenHeader } from '../../../components/ui';
import { WorkAreasPicker } from '../../../components/pickers';
import { useAuth } from '../../../context/AuthContext';
import { AREAS } from '../../../lib/constants';
import { errorMessage } from '../../../lib/format';
import { COLORS as C, TYPE } from '../../../theme';
import SetupFooter from './SetupFooter';

/** Caregiver setup, step 2 of 3: where they'll take jobs. */
export default function SetupAreasScreen() {
  const { refreshUser } = useAuth();
  const [areas, setAreas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!areas.length) { setError('Choose at least one area you can travel to.'); return; }
    setSaving(true);
    setError('');
    try {
      // Home base for distance = the first chosen area we have coordinates for.
      const base = areas.map((n) => AREAS.find((a) => a.name.toLowerCase() === n.toLowerCase())).find(Boolean);
      await caregiverApi.updateMe({
        work_areas: areas,
        location_name: areas[0],
        ...(base ? { latitude: base.lat, longitude: base.lng } : {}),
      });
      await refreshUser();   // navigator moves on to availability
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow="STEP 2 OF 3" title="Where can you work?"
          subtitle="Open a county and tap the areas you can get to easily. Families nearby will see you first." />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Card>
            <WorkAreasPicker value={areas} onChange={(v) => { setAreas(v); setError(''); }} />
          </Card>
          <Text style={[TYPE.caption, { textAlign: 'center' }]}>You can change these any time from your profile.</Text>
          {error ? <Notice>{error}</Notice> : null}
          <SetupFooter />
        </View>
      </ScrollView>
      <View style={st.bar}>
        <Button title={areas.length ? `Continue · ${areas.length} area${areas.length === 1 ? '' : 's'}` : 'Continue'}
          iconName="arrow-right" onPress={save} loading={saving} disabled={saving}
          variant={areas.length ? 'primary' : 'secondary'} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.borderLight },
});
