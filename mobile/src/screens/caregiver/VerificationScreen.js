import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { caregiverApi } from '../../api';
import { Button, Card, Input, LoadingScreen, Notice, ScreenHeader, StatusPill } from '../../components/ui';
import { COLORS as C, RADIUS, SHADOWS, TYPE } from '../../theme';
import { MAX_OTHER_DOCS, VERIFICATION_DOCS, VERIFICATION_STATUS } from '../../lib/constants';
import { errorMessage, fmtDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import SetupFooter from './setup/SetupFooter';

const ID_RE = /^\d{7,8}$/;
const MAX_MB = 10;

/** Take a photo, or pick a PDF / image file. Resolves to a file object or null. */
async function pickFile(key) {
  const choice = await new Promise((resolve) => {
    Alert.alert('Add document', 'Take a clear photo, or upload a PDF or photo you already have.', [
      { text: 'Take a photo', onPress: () => resolve('camera') },
      { text: 'Upload a file', onPress: () => resolve('file') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
  if (!choice) return null;

  if (choice === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access, or choose "Upload a file" instead.');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: `${key}-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', size: a.fileSize, file: a.file };
  }

  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name || `${key}.pdf`, mimeType: a.mimeType || 'application/pdf', size: a.size, file: a.file };
}

function appendFile(form, field, f) {
  // Expo web gives a real File; native needs the { uri, name, type } shape.
  if (Platform.OS === 'web' && f.file) form.append(field, f.file, f.name);
  else form.append(field, { uri: f.uri, name: f.name, type: f.mimeType });
}

/**
 * Caregiver verification: upload ID, good conduct and certificates, then wait
 * for Tunza's background check (2–3 days).
 */
export default function VerificationScreen({ navigation, route }) {
  // During first-time setup: no Back, and after submitting the app moves on to profile setup.
  const onboarding = !!route?.params?.onboarding;
  const { refreshUser } = useAuth();
  const goBack = onboarding ? undefined : () => navigation.goBack();
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [files, setFiles] = useState({});
  const [others, setOthers] = useState([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await caregiverApi.verification();
      setInfo(data);
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!info) {
    return loadError ? (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title="Verification" onBack={goBack} />
        <View style={{ paddingHorizontal: 20 }}>
          <Notice>{loadError}</Notice>
          <Button title="Try again" style={{ marginTop: 12 }} onPress={load} />
        </View>
      </View>
    ) : <LoadingScreen />;
  }

  if (justSubmitted || info.verification_status === 'pending') {
    return <Submitted info={info} justSubmitted={justSubmitted} onboarding={onboarding}
      onDone={onboarding ? () => refreshUser().catch(() => {}) : () => navigation.goBack()} />;
  }
  if (info.verification_status === 'approved') {
    return <Approved info={info} onBack={() => navigation.goBack()} />;
  }

  const pick = async (key) => {
    try {
      const f = await pickFile(key);
      if (!f) return;
      if (f.size && f.size > MAX_MB * 1024 * 1024) {
        Alert.alert('File too large', `Please choose a file under ${MAX_MB} MB. A photo usually works.`);
        return;
      }
      setErrors((e) => ({ ...e, [key]: '' }));
      if (key === 'other') setOthers((o) => [...o, f].slice(0, MAX_OTHER_DOCS));
      else setFiles((x) => ({ ...x, [key]: f }));
    } catch {
      Alert.alert('Could not add the file', 'Please try again, or choose a PDF, JPG or PNG.');
    }
  };

  const idOk = ID_RE.test(idNumber);
  const missing = VERIFICATION_DOCS.filter((d) => d.required && !files[d.key]);
  const ready = idOk && missing.length === 0 && consent;

  const submit = async () => {
    const e = {};
    if (!idOk) e.id_number = 'Enter your ID number: 7 or 8 digits.';
    missing.forEach((d) => { e[d.key] = 'Required'; });
    if (!consent) e.consent = 'Please agree so we can run the background check.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const form = new FormData();
    form.append('id_number', idNumber);
    Object.entries(files).forEach(([k, f]) => appendFile(form, k, f));
    others.forEach((f) => appendFile(form, 'other', f));

    setSubmitting(true);
    setProgress(0);
    try {
      const { data } = await caregiverApi.submitVerification(form, (ev) => {
        if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      if (onboarding) {
        // /auth/me/ now says "profile": the navigator opens profile setup.
        await refreshUser().catch(() => { setInfo(data); setJustSubmitted(true); });
        return;
      }
      setInfo(data);
      setJustSubmitted(true);
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(' ')])));
      }
      Alert.alert('Could not submit', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader title={onboarding ? 'Upload your documents' : 'Get verified'} onBack={goBack}
          eyebrow={onboarding ? 'GET VERIFIED' : undefined}
          subtitle={onboarding
            ? 'Upload a clear photo or scan of your national ID, your Certificate of Good Conduct and your CNA certificate. Other certificates are optional. Families only see background-checked caregivers.'
            : 'Families only see background-checked caregivers. Upload your documents once — we review them within 2–3 days.'} />

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {info.verification_status === 'rejected' ? (
            <Notice>
              {`We couldn't approve your last application.${info.verification_note ? `\nReason: ${info.verification_note}` : ''}\nPlease fix this and upload your documents again.`}
            </Notice>
          ) : null}

          <Card>
            <Text style={st.h}>National ID number</Text>
            <Input value={idNumber} keyboardType="number-pad" placeholder="e.g. 12345678" maxLength={8}
              onChangeText={(t) => { setIdNumber(t.replace(/\D/g, '').slice(0, 8)); setErrors((e) => ({ ...e, id_number: '' })); }}
              error={errors.id_number}
              hint={idOk ? 'Looks good.' : `Your ID number has 7 or 8 digits${idNumber ? ` (${idNumber.length} so far)` : ''}.`}
              right={idOk ? <Feather name="check-circle" size={18} color={C.success} /> : null}
              containerStyle={{ marginBottom: 0 }} />
          </Card>

          <Card>
            <Text style={st.h}>Documents</Text>
            <Text style={[TYPE.caption, { marginBottom: 12 }]}>PDF or photo, up to {MAX_MB} MB each. Make sure the text is sharp and nothing is cut off.</Text>
            {VERIFICATION_DOCS.map((d, i) => (
              <DocRow key={d.key} doc={d} file={files[d.key]} error={errors[d.key]} first={i === 0}
                onPick={() => pick(d.key)} onRemove={() => setFiles((x) => { const n = { ...x }; delete n[d.key]; return n; })} />
            ))}

            <View style={[st.docRow, st.divider]}>
              <View style={st.docIcon}><Feather name="file-plus" size={18} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={TYPE.h4}>Other relevant certificates <Text style={st.opt}>Optional</Text></Text>
                <Text style={TYPE.caption}>First aid, caregiving courses, references…</Text>
                {others.map((f, idx) => (
                  <View key={`${f.name}-${idx}`} style={st.otherRow}>
                    <Feather name="paperclip" size={13} color={C.textMuted} />
                    <Text style={[TYPE.caption, { flex: 1 }]} numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => setOthers((o) => o.filter((_, j) => j !== idx))} hitSlop={8}>
                      <Feather name="x" size={15} color={C.textFaint} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {others.length < MAX_OTHER_DOCS ? (
                <TouchableOpacity onPress={() => pick('other')} style={st.pickBtn}><Feather name="plus" size={17} color={C.primary} /></TouchableOpacity>
              ) : null}
            </View>
          </Card>

          <TouchableOpacity activeOpacity={0.85} onPress={() => { setConsent((v) => !v); setErrors((e) => ({ ...e, consent: '' })); }} style={st.consent}>
            <View style={[st.box, consent && st.boxOn]}>{consent ? <Feather name="check" size={14} color="#fff" /> : null}</View>
            <Text style={[TYPE.body, { flex: 1 }]}>
              I confirm these documents are mine and I agree that Tunza may check them and run a background check. They are stored privately and only Tunza's verification team can see them.
            </Text>
          </TouchableOpacity>
          {errors.consent ? <Text style={[st.err, { marginTop: -4 }]}>{errors.consent}</Text> : null}
          {onboarding ? <SetupFooter /> : null}
        </View>
      </ScrollView>

      <View style={st.bar}>
        <Button title={submitting ? (progress ? `Uploading… ${progress}%` : 'Uploading…') : 'Submit for verification'}
          iconName="upload-cloud" onPress={submit} loading={submitting && !progress} disabled={submitting}
          variant={ready ? 'primary' : 'secondary'} />
      </View>
    </KeyboardAvoidingView>
  );
}

function DocRow({ doc, file, error, first, onPick, onRemove }) {
  return (
    <View style={[st.docRow, !first && st.divider]}>
      <View style={[st.docIcon, file && { backgroundColor: C.successLight }]}>
        <Feather name={file ? 'check' : doc.icon} size={18} color={file ? C.success : C.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={TYPE.h4}>{doc.title} {doc.required ? null : <Text style={st.opt}>Optional</Text>}</Text>
        <Text style={[TYPE.caption, file && { color: C.success, fontWeight: '600' }]} numberOfLines={file ? 1 : 2}>
          {file ? file.name : doc.hint}
        </Text>
        {error ? <Text style={st.err}>{error}</Text> : null}
      </View>
      {file ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={onPick} style={st.pickBtn}><Feather name="refresh-cw" size={15} color={C.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={[st.pickBtn, { backgroundColor: C.muted }]}><Feather name="trash-2" size={15} color={C.textMuted} /></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={onPick} style={[st.pickBtn, error && { borderWidth: 1, borderColor: C.danger }]}>
          <Feather name="upload" size={17} color={C.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** "Thank you for your application" — shown right after submitting and while under review. */
function Submitted({ info, justSubmitted, onDone, onboarding }) {
  const insets = useSafeAreaInsets();
  const steps = [
    { icon: 'check', done: true, title: 'Documents received', sub: info.verification_submitted_at ? `Submitted ${fmtDate(info.verification_submitted_at)}` : '' },
    { icon: 'search', title: 'Background check', sub: 'We verify your ID, Certificate of Good Conduct and CNA certificate.' },
    { icon: 'bell', title: "We'll get back to you in 2–3 days", sub: "You'll get a notification once you're approved." },
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 40, paddingBottom: 40 }}>
      <View style={st.heroIcon}><Feather name="heart" size={34} color="#fff" /></View>
      <Text style={[TYPE.h1, { textAlign: 'center', marginTop: 20 }]}>Thank you for your application</Text>
      <Text style={[TYPE.bodyMd, { textAlign: 'center', marginTop: 10 }]}>
        We will conduct a background check and get back to you in 2 to 3 days.
      </Text>

      <Card style={{ marginTop: 28 }}>
        {steps.map((s, i) => (
          <View key={s.title} style={[st.tl, i > 0 && { marginTop: 16 }]}>
            <View style={[st.tlDot, s.done && { backgroundColor: C.success }]}>
              <Feather name={s.icon} size={14} color={s.done ? '#fff' : C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.h4}>{s.title}</Text>
              {s.sub ? <Text style={TYPE.caption}>{s.sub}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      <Notice kind="info" style={{ marginTop: 14 }}>
        {onboarding
          ? 'Next, set up your profile while we check your documents: bio, rate, areas and hours.'
          : "While you wait, finish your profile — add your work areas, specialties and weekly availability so you're ready for families the day you're approved."}
      </Notice>
      <Button title={onboarding ? 'Continue' : justSubmitted ? 'Done' : 'Back'} iconName={onboarding ? 'arrow-right' : undefined}
        onPress={onDone} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

function Approved({ info, onBack }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader title="Verification" onBack={onBack} />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[st.docIcon, { backgroundColor: C.successLight }]}><Feather name="shield" size={18} color={C.success} /></View>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.h4}>You're background checked</Text>
            <Text style={TYPE.caption}>ID {info.id_number_masked}</Text>
          </View>
          <StatusPill map={VERIFICATION_STATUS} status="approved" />
        </Card>
        <Card>
          <Text style={st.h}>Nursing verification</Text>
          <Text style={TYPE.body}>
            {info.nurse_verified
              ? 'Your nursing / CNA certificate is verified. You can take medication administration jobs — add it to your specialties.'
              : 'Medication administration jobs are only for caregivers with a verified nursing or CNA certificate. If you have one, contact Tunza support to add it.'}
          </Text>
        </Card>
        <Card>
          <Text style={st.h}>Documents on file</Text>
          {info.documents.map((d, i) => (
            <View key={d.id} style={[st.otherRow, i > 0 && { marginTop: 8 }]}>
              <Feather name="file-text" size={14} color={C.textMuted} />
              <Text style={[TYPE.body, { flex: 1 }]}>{d.label}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h:        { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 10 },
  err:      { color: C.danger, fontSize: 12, marginTop: 4 },
  opt:      { fontSize: 11, fontWeight: '600', color: C.textFaint },
  docRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider:  { borderTopWidth: 1, borderTopColor: C.borderLight },
  docIcon:  { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  pickBtn:  { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  consent:  { flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderLight },
  box:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn:    { backgroundColor: C.primary, borderColor: C.primary },
  bar:      { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderLight, ...SHADOWS.lg },
  heroIcon: { alignSelf: 'center', width: 80, height: 80, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  tl:       { flexDirection: 'row', gap: 12 },
  tlDot:    { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryXLight, alignItems: 'center', justifyContent: 'center' },
});
