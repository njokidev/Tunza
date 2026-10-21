import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { careRequestApi, caregiverApi } from '../../api';
import { Button, Chip, Input, Notice } from '../../components/ui';
import { AreaPicker, DateStrip } from '../../components/pickers';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import {
  BUDGET_BANDS, CARE_RECIPIENTS, DAYS, FALLBACK_SPECIALIZATIONS, SCHEDULE_TYPES,
} from '../../lib/constants';
import { addDays, errorMessage, fmtDate, kes, recipientLabel, todayISODate, unwrap } from '../../lib/format';

const STEPS = ['Who', 'What', 'When', 'Where', 'Budget'];
const HOURS = [2, 4, 6, 8, 10, 12, 24];

const PATHS = {
  smart_match:  { icon: 'zap',   label: 'Smart Match',  blurb: "We'll rank verified caregivers by how well they fit.", cta: 'Find my matches' },
  open_request: { icon: 'radio', label: 'Open request', blurb: 'Caregivers will see your request and apply with their rate.', cta: 'Post my request' },
};

/**
 * Care needs wizard (web: CareNeeds.jsx). Params: { path?, care_recipient? }.
 * Sends exactly the payload the web app sends, so matching behaves the same.
 */
export default function CareNeedsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [path, setPath] = useState(route.params?.path === 'open_request' ? 'open_request' : 'smart_match');
  const preset = route.params?.care_recipient;
  const [step, setStep] = useState(preset ? 1 : 0);
  const [form, setForm] = useState({
    care_recipient: preset || '',
    care_types: [],
    special_needs: '',
    preferred_gender: '',
    preferred_language: '',
    schedule_type: 'one_time',
    start_date: addDays(todayISODate(), 1),
    end_date: '',
    hours_per_day: 8,
    days_of_week: [],
    location_name: '',
    latitude: null,
    longitude: null,
    address: '',
    budget_band: 1,
  });
  const [specs, setSpecs] = useState(FALLBACK_SPECIALIZATIONS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    caregiverApi.specializations()
      .then((r) => { const list = unwrap(r.data); if (list.length) setSpecs(list); })
      .catch(() => {});
  }, []);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, value) =>
    set({ [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value] });

  const stepError = useMemo(() => {
    switch (step) {
      case 0: return form.care_recipient ? '' : 'Choose who needs care.';
      case 1: return form.care_types.length ? '' : 'Pick at least one type of care.';
      case 2:
        if (!form.start_date) return 'Choose a start date.';
        if (form.end_date && form.end_date < form.start_date) return 'End date must be after the start date.';
        if (form.schedule_type === 'recurring' && !form.days_of_week.length) return 'Pick the days you need care.';
        return '';
      case 3:
        if (!form.location_name) return 'Choose the area where care is needed.';
        if (form.address.trim().length < 5) return 'Add the estate, street or building so the caregiver can find you.';
        return '';
      default: return '';
    }
  }, [step, form]);

  const next = () => {
    if (stepError) { setError(stepError); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError('');
    if (step === 0) navigation.goBack(); else setStep((s) => s - 1);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    const band = BUDGET_BANDS[form.budget_band];
    const { budget_band, ...rest } = form; // eslint-disable-line no-unused-vars
    const payload = {
      ...rest,
      end_date: form.end_date || null,
      address: `${form.address.trim()}, ${form.location_name}`,
      budget_min: band.min,
      budget_max: band.max,
      discovery_path: path,
    };
    try {
      const { data } = await careRequestApi.create(payload);
      navigation.replace(path === 'smart_match' ? 'MatchResults' : 'Applications',
        { requestId: data.id, request: data, justCreated: true });
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const band = BUDGET_BANDS[form.budget_band];
  const P = PATHS[path];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Header + progress ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={back} style={s.back} hitSlop={10}>
          <Feather name="arrow-left" size={18} color={C.textBody} />
          <Text style={s.backTxt}>{step === 0 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={s.pathPill}>
          <Feather name={P.icon} size={12} color={C.primary} />
          <Text style={s.pathTxt}>{P.label}</Text>
        </View>
        <Text style={[TYPE.h2, { marginTop: 10 }]}>Tell us about the care you need</Text>
        <Text style={[TYPE.body, { color: C.textMuted, marginTop: 4 }]}>{P.blurb}</Text>
        <View style={s.progress}>
          {STEPS.map((label, i) => (
            <View key={label} style={{ flex: 1 }}>
              <View style={[s.bar, i <= step && { backgroundColor: C.primary }]} />
              <Text style={[s.barLbl, i === step && { color: C.primary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View>
            <Text style={s.q}>Who needs care?</Text>
            {CARE_RECIPIENTS.map((c) => {
              const on = form.care_recipient === c.value;
              return (
                <TouchableOpacity key={c.value} activeOpacity={0.85} onPress={() => set({ care_recipient: c.value })}
                  style={[s.option, on && s.optionOn]}>
                  <View style={[s.optIcon, on && { backgroundColor: C.primary }]}>
                    <Feather name={c.icon} size={17} color={on ? '#fff' : C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={TYPE.h4}>{c.label}</Text>
                    <Text style={TYPE.caption}>{c.hint}</Text>
                  </View>
                  {on ? <Feather name="check-circle" size={20} color={C.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={s.q}>What kind of help?</Text>
            <Text style={s.hint}>Pick all that apply — this is the biggest part of the match score.</Text>
            <View style={s.wrap}>
              {specs.map((sp) => (
                <Chip key={sp.id} label={sp.name} active={form.care_types.includes(sp.name)} onPress={() => toggle('care_types', sp.name)} />
              ))}
            </View>
            <View style={{ marginTop: 20 }}>
              <Input label="Anything the caregiver should know?" multiline
                placeholder="Medication, mobility, allergies, routines…"
                value={form.special_needs} onChangeText={(special_needs) => set({ special_needs })} />
            </View>
            <Text style={s.label}>Preferred caregiver gender</Text>
            <View style={s.wrap}>
              {[['', 'No preference'], ['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
                <Chip key={l} label={l} active={form.preferred_gender === v} onPress={() => set({ preferred_gender: v })} />
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.q}>When do you need care?</Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {SCHEDULE_TYPES.map((t) => {
                const on = form.schedule_type === t.value;
                return (
                  <TouchableOpacity key={t.value} activeOpacity={0.85} onPress={() => set({ schedule_type: t.value })}
                    style={[s.option, { marginBottom: 0 }, on && s.optionOn]}>
                    <View style={{ flex: 1 }}>
                      <Text style={TYPE.h4}>{t.label}</Text>
                      <Text style={TYPE.caption}>{t.hint}</Text>
                    </View>
                    {on ? <Feather name="check-circle" size={20} color={C.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Start date</Text>
            <DateStrip value={form.start_date} days={45}
              onChange={(start_date) => set({ start_date, end_date: form.end_date && form.end_date < start_date ? '' : form.end_date })} />

            {form.schedule_type !== 'one_time' ? (
              <>
                <Text style={s.label}>End date <Text style={TYPE.caption}>(optional)</Text></Text>
                <DateStrip value={form.end_date} minDate={form.start_date} days={60} allowClear clearLabel="Open" onChange={(end_date) => set({ end_date })} />
              </>
            ) : null}

            {form.schedule_type === 'recurring' ? (
              <>
                <Text style={s.label}>Which days?</Text>
                <View style={s.wrap}>
                  {DAYS.map((d, i) => (
                    <Chip key={d} label={d} active={form.days_of_week.includes(i)} onPress={() => toggle('days_of_week', i)} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={s.label}>Hours per day</Text>
            <View style={s.wrap}>
              {HOURS.map((h) => (
                <Chip key={h} label={`${h} hrs`} active={form.hours_per_day === h} onPress={() => set({ hours_per_day: h })} />
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={s.q}>Where will care happen?</Text>
            <Text style={s.hint}>We use the area to find caregivers close to you.</Text>
            <AreaPicker value={form} onChange={(loc) => set(loc)} />
            <View style={{ marginTop: 20 }}>
              <Input label="Estate, street or building" placeholder="e.g. Kileleshwa Gardens, Hse 12, Othaya Rd"
                value={form.address} onChangeText={(address) => set({ address })} iconName="home" />
            </View>
            <Notice kind="info">Your exact address is only shared with a caregiver you book.</Notice>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={s.q}>What's your hourly budget?</Text>
            <Text style={s.hint}>In KES per hour. Caregivers above your budget rank lower, not out.</Text>
            <View style={s.wrap}>
              {BUDGET_BANDS.map((b, i) => (
                <Chip key={b.label} label={b.label} active={form.budget_band === i} onPress={() => set({ budget_band: i })} />
              ))}
            </View>

            <Text style={s.label}>How should we find your caregiver?</Text>
            {Object.entries(PATHS).map(([key, p]) => {
              const on = path === key;
              return (
                <TouchableOpacity key={key} activeOpacity={0.85} onPress={() => setPath(key)} style={[s.option, on && s.optionOn]}>
                  <View style={[s.optIcon, on && { backgroundColor: C.primary }]}>
                    <Feather name={p.icon} size={17} color={on ? '#fff' : C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={TYPE.h4}>{p.label}</Text>
                    <Text style={TYPE.caption}>{p.blurb}</Text>
                  </View>
                  {on ? <Feather name="check-circle" size={20} color={C.primary} /> : null}
                </TouchableOpacity>
              );
            })}

            <View style={s.summary}>
              <Text style={[TYPE.h4, { marginBottom: 8 }]}>Summary</Text>
              {[
                ['For', recipientLabel(form.care_recipient)],
                ['Care', form.care_types.join(', ')],
                ['When', `${SCHEDULE_TYPES.find((t) => t.value === form.schedule_type)?.label} from ${fmtDate(form.start_date)}${form.end_date ? ` to ${fmtDate(form.end_date)}` : ''} · ${form.hours_per_day} hrs/day`],
                ['Where', `${form.address}, ${form.location_name}`],
                ['Budget', band.max ? `${kes(band.min)} – ${kes(band.max)}/hr` : 'Flexible'],
              ].map(([k, v]) => (
                <View key={k} style={s.sumRow}>
                  <Text style={[TYPE.caption, { width: 64 }]}>{k}</Text>
                  <Text style={[TYPE.label, { flex: 1, fontWeight: '600' }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {error ? <Notice style={{ marginTop: 16 }}>{error}</Notice> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isLast ? (
          <Button title={P.cta} iconName={P.icon} onPress={submit} loading={submitting} />
        ) : (
          <Button title="Continue" onPress={next} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:   { paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.bg },
  back:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, alignSelf: 'flex-start' },
  backTxt:  { fontSize: 14, fontWeight: '600', color: C.textBody },
  pathPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.primaryXLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  pathTxt:  { fontSize: 12, fontWeight: '800', color: C.primary },
  progress: { flexDirection: 'row', gap: 6, marginTop: 16 },
  bar:      { height: 5, borderRadius: 3, backgroundColor: C.border },
  barLbl:   { fontSize: 11, fontWeight: '700', color: C.textFaint, marginTop: 5 },

  body:     { padding: 20, paddingBottom: 120 },
  q:        { fontSize: 19, fontWeight: '800', color: C.text, marginBottom: 6 },
  hint:     { fontSize: 13, color: C.textMuted, marginBottom: 14 },
  label:    { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 10 },
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  option:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 10 },
  optionOn: { borderColor: C.primary, backgroundColor: C.primaryXLight },
  optIcon:  { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },

  summary:  { marginTop: 14, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.borderLight },
  sumRow:   { flexDirection: 'row', paddingVertical: 5 },

  footer:   { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
});
