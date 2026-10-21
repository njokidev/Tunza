import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseMedical,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react-native';

const PURPLE = '#6842C2';
const PURPLE_DARK = '#4D2A9A';
const PURPLE_LIGHT = '#F1ECFC';
const INK = '#201A2B';
const MUTED = '#777181';
const BORDER = '#E7E2EF';
const SURFACE = '#FFFFFF';
const GREEN = '#23845B';
const BACKGROUND = '#FAF9FC';

const STEPS = [
  { title: 'Account', subtitle: 'Create your account' },
  { title: 'Experience', subtitle: 'Tell us about your care' },
  { title: 'Qualifications', subtitle: 'Add your credentials' },
  { title: 'Identity', subtitle: 'Help us build trust' },
  { title: 'Review', subtitle: 'Your next steps' },
];

const CARE_TYPES = [
  'Elderly care',
  'Post-surgery recovery',
  'Memory & dementia care',
  'Palliative care',
  'Mobility support',
  'Chronic illness support',
  'Companionship',
  'Personal care',
];

const LANGUAGES = ['English', 'Kiswahili', 'Kikuyu', 'Luo', 'Kalenjin', 'Luhya', 'Kamba', 'Somali'];

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  yearsExperience: '',
  careTypes: [],
  languages: ['English', 'Kiswahili'],
  bio: '',
  location: '',
  hourlyRate: '500',
  documents: {},
  idType: 'National ID',
  backgroundConsent: false,
};

export default function CaregiverOnboardingScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;
  const selectedCareCount = form.careTypes.length;

  const update = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const toggleArrayValue = (key, value) => {
    setForm(current => {
      const selected = current[key];
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value],
      };
    });
  };

  const pickDocument = async key => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const picked = {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      };
      if (key === 'profilePhoto') {
        update('profilePhoto', picked);
      } else if (key === 'identity') {
        update('documents', { ...form.documents, identity: picked });
      } else {
        update('documents', { ...form.documents, [key]: picked });
      }
    } catch {
      Alert.alert('Could not select file', 'Please try again or choose a PDF, JPG, or PNG file.');
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
        Alert.alert('A few details are missing', 'Enter your name, phone number, email and password to continue.');
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        Alert.alert('Check your email', 'Enter a valid email address.');
        return false;
      }
      if (form.password.length < 8) {
        Alert.alert('Choose a stronger password', 'Use at least 8 characters.');
        return false;
      }
    }
    if (step === 1) {
      if (!form.yearsExperience || form.careTypes.length === 0 || !form.bio.trim()) {
        Alert.alert('Complete your care profile', 'Choose your experience level and at least one care type, then add a short bio.');
        return false;
      }
    }
    if (step === 3 && !form.backgroundConsent) {
      Alert.alert('Consent required', 'Please confirm whether you consent to the background-check process before continuing.');
      return false;
    }
    return true;
  };

  const next = async () => {
    if (!validateStep()) return;
    if (step < 3) {
      setStep(current => current + 1);
      return;
    }
    setSaving(true);
    // UI prototype: connect this action to your Django registration/profile API.
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    setStep(4);
  };

  const saveDraft = () => {
    Alert.alert(
      'Draft ready to save',
      'This screen currently keeps your entries while it remains open. Connect this action to your API or secure local storage to persist drafts between sessions.'
    );
  };

  const goBack = () => setStep(current => Math.max(0, current - 1));

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0: return 'Let’s get you started';
      case 1: return 'Your care experience';
      case 2: return 'Your qualifications';
      case 3: return 'Identity & safety';
      default: return 'You’re on your way';
    }
  }, [step]);

  const stepDescription = useMemo(() => {
    switch (step) {
      case 0: return 'Create a Tunza caregiver account. You can complete your profile in stages.';
      case 1: return 'Help families understand your skills, experience and the support you provide.';
      case 2: return 'Upload any certificates or professional documents you have available.';
      case 3: return 'Identity checks help families make informed, safer care decisions.';
      default: return 'Your profile can move through review while you prepare the rest of your details.';
    }
  }, [step]);

  const renderField = (
    label,
    value,
    onChangeText,
    options = {},
  ) => (
    <View style={styles.field} key={label}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={options.placeholder}
        placeholderTextColor="#A7A1B2"
        keyboardType={options.keyboardType ?? 'default'}
        secureTextEntry={options.secureTextEntry}
        multiline={options.multiline}
        maxLength={options.maxLength}
        autoCapitalize={options.autoCapitalize ?? 'sentences'}
        style={[styles.input, options.multiline && styles.textArea]}
        textAlignVertical={options.multiline ? 'top' : 'center'}
      />
      {options.helper ? <Text style={styles.helper}>{options.helper}</Text> : null}
    </View>
  );

  const renderChoice = (
    label,
    selected,
    onPress,
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
      {selected ? <Check size={14} color={PURPLE} /> : null}
    </Pressable>
  );

  const renderUpload = (
    title,
    description,
    documentKey,
    optional = true,
  ) => {
    const doc = form.documents[documentKey];
    return (
      <View style={styles.uploadCard} key={documentKey}>
        <View style={styles.uploadIcon}>
          {doc ? <FileCheck2 size={21} color={GREEN} /> : <FileText size={21} color={PURPLE} />}
        </View>
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadDescription}>{doc ? doc.name : description}</Text>
          {doc ? <Text style={styles.uploadSuccess}>Selected · ready to upload</Text> : null}
        </View>
        <Pressable style={styles.uploadAction} onPress={() => pickDocument(documentKey)}>
          {doc ? <Text style={styles.uploadActionText}>Change</Text> : <Upload size={17} color={PURPLE} />}
        </Pressable>
      </View>
    );
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <View style={styles.roleBanner}>
            <View style={styles.roleIcon}><BriefcaseMedical size={22} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleTitle}>I’m offering care</Text>
              <Text style={styles.roleSubtitle}>Caregiver registration</Text>
            </View>
            <CheckCircle2 size={20} color={PURPLE} />
          </View>
          {renderField('Full name', form.fullName, value => update('fullName', value), { placeholder: 'As shown on your ID', autoCapitalize: 'words' })}
          {renderField('Mobile number', form.phone, value => update('phone', value), { placeholder: '+254 7XX XXX XXX', keyboardType: 'phone-pad' })}
          {renderField('Email address', form.email, value => update('email', value), { placeholder: 'you@example.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={form.password}
                onChangeText={value => update('password', value)}
                placeholder="At least 8 characters"
                placeholderTextColor="#A7A1B2"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
              />
              <Pressable onPress={() => setShowPassword(value => !value)} style={styles.showPassword}>
                <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.privacyNote}>
            <LockKeyhole size={16} color={PURPLE} />
            <Text style={styles.privacyText}>Your details are used to set up your Tunza account.</Text>
          </View>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text style={styles.sectionLabel}>YEARS OF EXPERIENCE</Text>
          <View style={styles.experienceOptions}>
            {['Less than 1 year', '1–3 years', '4–7 years', '8+ years'].map(value => (
              <Pressable
                key={value}
                onPress={() => update('yearsExperience', value)}
                style={[styles.experienceOption, form.yearsExperience === value && styles.experienceOptionSelected]}
              >
                <View style={[styles.radioOuter, form.yearsExperience === value && styles.radioOuterSelected]}>
                  {form.yearsExperience === value ? <View style={styles.radioInner} /> : null}
                </View>
                <Text style={[styles.experienceOptionText, form.yearsExperience === value && styles.choiceTextSelected]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>TYPES OF CARE</Text>
            <Text style={styles.selectionCount}>{selectedCareCount} selected</Text>
          </View>
          <View style={styles.chipWrap}>
            {CARE_TYPES.map(value => renderChoice(value, form.careTypes.includes(value), () => toggleArrayValue('careTypes', value)))}
          </View>
          <Text style={styles.sectionLabel}>LANGUAGES SPOKEN</Text>
          <View style={styles.chipWrap}>
            {LANGUAGES.map(value => renderChoice(value, form.languages.includes(value), () => toggleArrayValue('languages', value)))}
          </View>
          {renderField('Short introduction', form.bio, value => update('bio', value), {
            placeholder: 'Tell families about your approach to care, strengths and experience…',
            multiline: true,
            maxLength: 300,
            helper: `${form.bio.length}/300 characters`,
          })}
          {renderField('Town / area you serve', form.location, value => update('location', value), { placeholder: 'e.g. Kilimani, Nairobi', autoCapitalize: 'words' })}
          {renderField('Hourly rate (KES)', form.hourlyRate, value => update('hourlyRate', value), { placeholder: '500', keyboardType: 'numeric', helper: 'You can update your rate later.' })}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <View style={styles.infoBanner}>
            <ShieldCheck size={21} color={PURPLE} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBannerTitle}>Build a trusted profile</Text>
              <Text style={styles.infoBannerText}>Only upload genuine documents. Tunza should review them before displaying verification badges.</Text>
            </View>
          </View>
          <Text style={styles.sectionLabel}>PROFESSIONAL DOCUMENTS</Text>
          {renderUpload('Professional licence', 'Nursing or other relevant licence · PDF, JPG, PNG', 'licence')}
          {renderUpload('First Aid / CPR certificate', 'Add a certificate if you have one', 'firstAid')}
          {renderUpload('Other care certifications', 'Dementia, patient care or specialist training', 'certifications')}
          {renderUpload('Education / diploma', 'Relevant education document (optional)', 'education')}
          <Text style={styles.uploadFootnote}>You can continue without these documents and add them later. Your profile may remain unverified until the required checks are complete.</Text>
          <Text style={styles.sectionLabel}>PROFILE PHOTO</Text>
          <Pressable style={styles.photoUpload} onPress={() => pickDocument('profilePhoto')}>
            <View style={styles.photoIcon}><UserRound size={23} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>{form.profilePhoto?.name ?? 'Add a professional photo'}</Text>
              <Text style={styles.uploadDescription}>A clear, friendly photo helps families recognise you.</Text>
            </View>
            <Upload size={18} color={PURPLE} />
          </Pressable>
        </>
      );
    }

    if (step === 3) {
      const identityDoc = form.documents.identity;
      return (
        <>
          <View style={styles.safetyHero}>
            <View style={styles.safetyIcon}><ShieldCheck size={28} color={PURPLE} /></View>
            <Text style={styles.safetyTitle}>Safety starts with trust</Text>
            <Text style={styles.safetySubtitle}>Identity verification helps protect caregivers and the families they support.</Text>
          </View>
          <Text style={styles.label}>Government-issued ID</Text>
          <View style={styles.idTypeWrap}>
            {['National ID', 'Passport', 'Driving licence'].map(value => (
              <Pressable key={value} onPress={() => update('idType', value)} style={[styles.idType, form.idType === value && styles.idTypeSelected]}>
                <Text style={[styles.idTypeText, form.idType === value && styles.choiceTextSelected]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.identityUpload, identityDoc && styles.identityUploadDone]} onPress={() => pickDocument('identity')}>
            <View style={styles.identityUploadIcon}>{identityDoc ? <CheckCircle2 size={25} color={GREEN} /> : <Upload size={25} color={PURPLE} />}</View>
            <Text style={styles.identityUploadTitle}>{identityDoc ? identityDoc.name : 'Upload a photo or scan of your ID'}</Text>
            <Text style={styles.identityUploadSubtitle}>{identityDoc ? 'Selected · tap to replace' : 'PDF, JPG or PNG · Make sure the details are readable'}</Text>
          </Pressable>
          <View style={styles.securityCard}>
            <LockKeyhole size={20} color={PURPLE} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Your documents deserve care too</Text>
              <Text style={styles.securityText}>Store identity documents securely, restrict staff access, and define a clear retention policy before launch. Do not display ID documents publicly.</Text>
            </View>
          </View>
          <Pressable style={styles.consentRow} onPress={() => update('backgroundConsent', !form.backgroundConsent)}>
            <View style={[styles.checkbox, form.backgroundConsent && styles.checkboxChecked]}>
              {form.backgroundConsent ? <Check size={15} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.consentText}>I consent to Tunza contacting me about the identity and background-verification process.</Text>
          </Pressable>
          <Text style={styles.helper}>This consent is a UI placeholder, not a completed background check. Add a compliant verification provider and clear privacy/consent wording before production.</Text>
        </>
      );
    }

    return (
      <>
        <View style={styles.pendingHero}>
          <View style={styles.pendingIcon}><Clock3 size={32} color={PURPLE} /></View>
          <Text style={styles.pendingTitle}>Your onboarding profile is ready for the next step</Text>
          <Text style={styles.pendingSubtitle}>Once connected to Tunza’s backend, your information can be submitted for review. We’ll show your actual status here.</Text>
        </View>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDotDone}><Check size={13} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Account details</Text>
              <Text style={styles.statusSubtitle}>Completed in this session</Text>
            </View>
            <Text style={styles.statusDone}>Done</Text>
          </View>
          <View style={styles.statusLine} />
          <View style={styles.statusRow}>
            <View style={styles.statusDotDone}><Check size={13} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Care profile</Text>
              <Text style={styles.statusSubtitle}>{form.careTypes.length} care types · {form.yearsExperience || 'Experience not set'}</Text>
            </View>
            <Text style={styles.statusDone}>Done</Text>
          </View>
          <View style={styles.statusLine} />
          <View style={styles.statusRow}>
            <View style={styles.statusDotPending}><Clock3 size={13} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Document review</Text>
              <Text style={styles.statusSubtitle}>{Object.keys(form.documents).filter(key => form.documents[key]).length} document(s) selected</Text>
            </View>
            <Text style={styles.statusPending}>Next</Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>YOU CAN COMPLETE THESE NEXT</Text>
        <View style={styles.nextTask}>
          <View style={styles.nextTaskIcon}><MapPin size={18} color={PURPLE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTaskTitle}>Confirm your service area</Text>
            <Text style={styles.nextTaskText}>{form.location || 'Add your town or neighbourhood'}</Text>
          </View>
          <CheckCircle2 size={18} color={form.location ? GREEN : BORDER} />
        </View>
        <View style={styles.nextTask}>
          <View style={styles.nextTaskIcon}><Clock3 size={18} color={PURPLE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTaskTitle}>Set your availability</Text>
            <Text style={styles.nextTaskText}>Choose days and times you can provide care.</Text>
          </View>
          <ChevronDown size={18} color={MUTED} />
        </View>
        <View style={styles.nextTask}>
          <View style={styles.nextTaskIcon}><BadgeCheck size={18} color={PURPLE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTaskTitle}>Complete verification</Text>
            <Text style={styles.nextTaskText}>Only show badges after checks are confirmed.</Text>
          </View>
          <ChevronDown size={18} color={MUTED} />
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => { setStep(1); }}>
          <Text style={styles.secondaryButtonText}>Review my care profile</Text>
        </Pressable>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          {step > 0 && step < 4 ? (
            <Pressable style={styles.backButton} onPress={goBack} accessibilityLabel="Go back">
              <ArrowLeft size={20} color={INK} />
            </Pressable>
          ) : (
            <View style={styles.logoMark}><Text style={styles.logoLetter}>t</Text></View>
          )}
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>tunza</Text>
            <Text style={styles.brandTagline}>Building trust in homecare</Text>
          </View>
          {step < 4 ? (
            <Pressable onPress={saveDraft} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save draft</Text>
            </Pressable>
          ) : null}
        </View>

        {step < 4 ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressStep}>STEP {step + 1} OF 4</Text>
              <Text style={styles.progressPercent}>{Math.round((step + 1) / 4 * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} /></View>
            <View style={styles.stepLabels}>
              {STEPS.slice(0, 4).map((item, index) => (
                <Text key={item.title} style={[styles.stepLabel, index === step && styles.stepLabelActive, index < step && styles.stepLabelDone]}>{item.title}</Text>
              ))}
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeading}>
            <Text style={styles.eyebrow}>{step === 4 ? 'ONBOARDING' : 'CAREGIVER ONBOARDING'}</Text>
            <Text style={styles.pageTitle}>{stepTitle}</Text>
            <Text style={styles.pageDescription}>{stepDescription}</Text>
          </View>

          {renderStep()}

          <View style={styles.footer}>
            {step < 4 ? (
              <>
                <Pressable
                  style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                  onPress={next}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.primaryButtonText}>{step === 3 ? 'Submit for review' : 'Continue'}</Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
                <Text style={styles.footerHint}>
                  {step === 2 ? 'You can add missing certificates later.' : step === 3 ? 'Your information should only be used for verification.' : 'Your progress stays on this screen while you complete the steps.'}
                </Text>
              </>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => { setStep(0); setForm(initialForm); }}>
                <Text style={styles.primaryButtonText}>Back to start</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
          <Text style={styles.legalText}>By continuing, you agree to Tunza’s Terms of Service and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  flex: { flex: 1 },
  topBar: { minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0EDF5', backgroundColor: SURFACE },
  logoMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', lineHeight: 31 },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F6F3FA', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandBlock: { marginLeft: 10, flex: 1 },
  brandName: { color: INK, fontSize: 19, fontWeight: '800', letterSpacing: -0.6 },
  brandTagline: { color: MUTED, fontSize: 11, marginTop: 1 },
  saveButton: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: BORDER, borderRadius: 10 },
  saveButtonText: { color: PURPLE, fontSize: 12, fontWeight: '700' },
  progressWrap: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 13, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: '#F0EDF5' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  progressStep: { color: MUTED, fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  progressPercent: { color: PURPLE, fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: '#EDE8F6', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 5, backgroundColor: PURPLE },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  stepLabel: { color: '#A49EAF', fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: PURPLE, fontWeight: '800' },
  stepLabelDone: { color: GREEN },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 30 },
  pageHeading: { marginBottom: 25 },
  eyebrow: { color: PURPLE, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 9 },
  pageTitle: { color: INK, fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7 },
  pageDescription: { color: MUTED, fontSize: 14, lineHeight: 21, marginTop: 8 },
  roleBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: PURPLE_LIGHT, borderColor: '#DCD0F7', borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 22 },
  roleIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  roleTitle: { color: INK, fontWeight: '800', fontSize: 14 },
  roleSubtitle: { color: MUTED, fontSize: 12, marginTop: 3 },
  field: { marginBottom: 17 },
  label: { color: INK, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 49, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 12, color: INK, backgroundColor: SURFACE, fontSize: 14 },
  textArea: { minHeight: 112, paddingTop: 13 },
  helper: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 6 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: SURFACE, paddingRight: 12 },
  showPassword: { padding: 8 },
  showPasswordText: { color: PURPLE, fontSize: 12, fontWeight: '700' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: '#F2EFF9', borderRadius: 12, gap: 9, marginTop: 2 },
  privacyText: { color: '#5F5573', fontSize: 12, lineHeight: 17, flex: 1 },
  sectionLabel: { color: MUTED, fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginTop: 7, marginBottom: 12 },
  experienceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 22 },
  experienceOption: { width: '48%', minHeight: 48, paddingHorizontal: 11, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: SURFACE, flexDirection: 'row', alignItems: 'center', gap: 8 },
  experienceOptionSelected: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  radioOuter: { width: 17, height: 17, borderWidth: 1.5, borderColor: '#B6AFBF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderColor: PURPLE },
  radioInner: { width: 8, height: 8, borderRadius: 5, backgroundColor: PURPLE },
  experienceOptionText: { color: INK, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectionCount: { color: PURPLE, fontSize: 11, fontWeight: '700', marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 21 },
  choiceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  choiceChipSelected: { borderColor: '#C6B4F0', backgroundColor: PURPLE_LIGHT },
  choiceText: { color: '#625C6D', fontSize: 12, fontWeight: '600' },
  choiceTextSelected: { color: PURPLE_DARK, fontWeight: '800' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14, borderRadius: 13, backgroundColor: PURPLE_LIGHT, marginBottom: 23 },
  infoBannerTitle: { color: INK, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  infoBannerText: { color: '#655A78', fontSize: 12, lineHeight: 17 },
  uploadCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 14, backgroundColor: SURFACE, padding: 12, marginBottom: 10 },
  uploadIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  uploadInfo: { flex: 1 },
  uploadTitle: { color: INK, fontSize: 12, fontWeight: '800' },
  uploadDescription: { color: MUTED, fontSize: 11, lineHeight: 15, marginTop: 4 },
  uploadSuccess: { color: GREEN, fontSize: 10, fontWeight: '700', marginTop: 4 },
  uploadAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F7F4FC', marginLeft: 8 },
  uploadActionText: { color: PURPLE, fontSize: 11, fontWeight: '800' },
  uploadFootnote: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 2, marginBottom: 19 },
  photoUpload: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9BCE5', borderRadius: 13, padding: 13, backgroundColor: '#FCFAFF', marginBottom: 12 },
  photoIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  safetyHero: { alignItems: 'center', paddingVertical: 10, marginBottom: 22 },
  safetyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  safetyTitle: { color: INK, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  safetySubtitle: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  idTypeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  idType: { borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10 },
  idTypeSelected: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  idTypeText: { color: '#625C6D', fontSize: 11, fontWeight: '700' },
  identityUpload: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7B8E9', backgroundColor: '#FCFAFF', borderRadius: 16, paddingVertical: 24, paddingHorizontal: 18, marginBottom: 17 },
  identityUploadDone: { borderStyle: 'solid', borderColor: '#A8D8C2', backgroundColor: '#F5FCF8' },
  identityUploadIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: '#F0EAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  identityUploadTitle: { color: INK, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  identityUploadSubtitle: { color: MUTED, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 6 },
  securityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#F2EFF9', borderRadius: 13, padding: 14, marginBottom: 17 },
  securityTitle: { color: INK, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  securityText: { color: '#655A78', fontSize: 11, lineHeight: 17 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  checkbox: { width: 21, height: 21, borderWidth: 1.5, borderColor: '#B8B0C6', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  consentText: { flex: 1, color: INK, fontSize: 12, lineHeight: 18 },
  pendingHero: { alignItems: 'center', paddingVertical: 8, marginBottom: 22 },
  pendingIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pendingTitle: { color: INK, fontSize: 21, lineHeight: 27, fontWeight: '800', textAlign: 'center', maxWidth: 310 },
  pendingSubtitle: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9, maxWidth: 315 },
  statusCard: { borderWidth: 1, borderColor: BORDER, borderRadius: 15, backgroundColor: SURFACE, padding: 15, marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 },
  statusDotDone: { width: 25, height: 25, borderRadius: 13, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  statusDotPending: { width: 25, height: 25, borderRadius: 13, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  statusLine: { height: 17, width: 1, backgroundColor: BORDER, marginLeft: 12, marginVertical: 1 },
  statusTitle: { color: INK, fontSize: 12, fontWeight: '800' },
  statusSubtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  statusDone: { color: GREEN, fontSize: 10, fontWeight: '800' },
  statusPending: { color: PURPLE, fontSize: 10, fontWeight: '800' },
  nextTask: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, borderRadius: 13, marginBottom: 9 },
  nextTaskIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  nextTaskTitle: { color: INK, fontSize: 12, fontWeight: '800' },
  nextTaskText: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 4 },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#CDBFEB', marginTop: 9 },
  secondaryButtonText: { color: PURPLE, fontSize: 13, fontWeight: '800' },
  footer: { marginTop: 17 },
  primaryButton: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, backgroundColor: PURPLE, paddingHorizontal: 18 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  footerHint: { color: MUTED, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 11 },
  legalText: { color: '#A09AAA', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 24 },
});
