import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowRight, Check, CheckCircle2, Clock, FileText, Lock, LogOut, ShieldCheck, Upload, X,
} from 'lucide-react';
import AuthShell from '../auth/AuthShell';
import { Alert, Button, Field, PageLoader } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { caregiverApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import {
  AREAS, AREA_COUNTIES, DAYS_LONG, LANGUAGES, MAX_OTHER_DOCS, VERIFICATION_DOCS, countyOf,
} from '../../lib/constants';
import { fmtDay } from '../../lib/format';
import { needsPhoneVerification } from '../auth/VerifyPhone';

/**
 * Caregiver first-time setup (web), same steps and rules as the mobile app:
 *   documents -> profile -> areas -> availability
 * The background check (2-3 days) runs alongside: they finish setup and use the app
 * while they wait, hidden from families until approved.
 * The backend decides the step (/auth/me/ caregiver_setup.next); each step saves,
 * then refreshUser() moves this page on to the next one.
 */
export default function CaregiverSetup() {
  const { user, booting } = useAuth();
  if (booting) return <PageLoader label="Opening Tunza…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'caregiver') return <Navigate to={homeFor(user.role)} replace />;
  if (needsPhoneVerification(user)) return <Navigate to="/verify-phone" replace />;
  const next = user.caregiver_setup?.next;
  if (!next) return <Navigate to="/caregiver" replace />;

  const Step = { documents: Documents, profile: Profile, areas: Areas, availability: Availability }[next];
  if (!Step) return <Navigate to="/caregiver" replace />;
  return (
    <AuthShell>
      <Step setup={user.caregiver_setup} />
      <LogoutLink />
    </AuthShell>
  );
}

const chip = (on) => `chip ${on ? 'chip-on' : 'chip-off'}`;
const MAX_MB = 10;

function Heading({ eyebrow, title, children }) {
  return (
    <div>
      {eyebrow && <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{eyebrow}</div>}
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">{title}</h2>
      {children && <p className="mt-1 text-sm text-gray-500">{children}</p>}
    </div>
  );
}

function LogoutLink() {
  const { logout } = useAuth();
  return (
    <button type="button" className="mx-auto mt-8 flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600"
      onClick={() => { if (window.confirm('Log out? Your progress so far is saved.')) logout(); }}>
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}

// ── 1. Documents ─────────────────────────────────────────────────────────────
function Documents({ setup }) {
  const { refreshUser } = useAuth();
  const [idNumber, setIdNumber] = useState('');
  const [files, setFiles] = useState({});
  const [others, setOthers] = useState([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const rejected = setup.verification_status === 'rejected';

  const pick = (key, list) => {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { setErrors((e) => ({ ...e, [key]: `Choose a file under ${MAX_MB} MB.` })); return; }
    setErrors((e) => ({ ...e, [key]: '' }));
    if (key === 'other') setOthers((o) => [...o, f].slice(0, MAX_OTHER_DOCS));
    else setFiles((x) => ({ ...x, [key]: f }));
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!/^\d{7,8}$/.test(idNumber)) e.id_number = 'Enter your ID number: 7 or 8 digits.';
    VERIFICATION_DOCS.filter((d) => d.required && !files[d.key]).forEach((d) => { e[d.key] = 'Required'; });
    if (!consent) e.consent = 'Please agree so we can run the background check.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const form = new FormData();
    form.append('id_number', idNumber);
    Object.entries(files).forEach(([k, f]) => form.append(k, f));
    others.forEach((f) => form.append('other', f));
    setBusy(true); setProgress(0);
    try {
      await caregiverApi.submitVerification(form, (p) => { if (p.total) setProgress(Math.round((p.loaded / p.total) * 100)); });
      await refreshUser();   // -> profile setup
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(' ')])));
      }
      setErrors((x) => ({ ...x, _: errorMessage(err) }));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Heading eyebrow="Get verified" title="Upload your documents">
        Upload a clear photo or scan of your national ID, your Certificate of Good Conduct, and any other relevant
        certificates. Families only see background-checked caregivers.
      </Heading>
      {rejected && (
        <Alert>
          We couldn't approve your last application.{setup.verification_note ? ` Reason: ${setup.verification_note}.` : ''} Please fix this and upload your documents again.
        </Alert>
      )}
      <Field label="National ID number" error={errors.id_number}>
        <input className="input" inputMode="numeric" placeholder="e.g. 12345678" value={idNumber}
          onChange={(e) => { setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 8)); setErrors((x) => ({ ...x, id_number: '' })); }} />
      </Field>
      <div className="space-y-2">
        {VERIFICATION_DOCS.map((d) => (
          <FileRow key={d.key} doc={d} file={files[d.key]} error={errors[d.key]}
            onPick={(l) => pick(d.key, l)} onRemove={() => setFiles((x) => { const n = { ...x }; delete n[d.key]; return n; })} />
        ))}
        {others.map((f, i) => (
          <FileRow key={`o${i}`} doc={{ title: 'Other certificate', hint: '' }} file={f}
            onRemove={() => setOthers((o) => o.filter((_, j) => j !== i))} />
        ))}
        {others.length < MAX_OTHER_DOCS && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            <Upload className="h-4 w-4" /> Add another certificate (optional)
            <input type="file" className="hidden" accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => { pick('other', e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <label className="flex items-start gap-3 text-sm text-gray-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-brand-700" checked={consent}
          onChange={(e) => { setConsent(e.target.checked); setErrors((x) => ({ ...x, consent: '' })); }} />
        I agree that Tunza may check these documents and run a background check on me.
      </label>
      {errors.consent && <p className="-mt-3 text-xs font-medium text-red-600">{errors.consent}</p>}
      <Alert>{errors._}</Alert>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {busy ? (progress ? `Uploading… ${progress}%` : 'Uploading…') : 'Submit for verification'}
      </Button>
    </form>
  );
}

function FileRow({ doc, file, error, onPick, onRemove }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${error ? 'border-red-300 bg-red-50' : file ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      {file ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <FileText className="h-5 w-5 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">
          {doc.title}{doc.required === false && <span className="font-normal text-gray-400"> (optional)</span>}
        </div>
        <div className="truncate text-xs text-gray-500">{file ? file.name : error || doc.hint}</div>
      </div>
      {file ? (
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600" aria-label={`Remove ${doc.title}`}>
          <X className="h-4 w-4" />
        </button>
      ) : (
        <label className="cursor-pointer rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">
          Choose
          <input type="file" className="hidden" accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => { onPick(e.target.files); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
}

// ── 2. Profile (while the documents are checked, or after approval) ──────────────────────────────────────────────
const MIN_BIO = 40;
const MIN_RATE = 100;

function Profile({ setup }) {
  const { refreshUser } = useAuth();
  const [specs, setSpecs] = useState([]);
  const [nurse, setNurse] = useState(false);
  const [form, setForm] = useState({
    bio: '', years_exp: '', hourly_rate: '500', day_shift_rate: '', night_shift_rate: '',
    specialization_ids: [], languages: ['English', 'Kiswahili'], gender: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([caregiverApi.specializations(), caregiverApi.me()]).then(([sp, me]) => {
      setSpecs(unwrap(sp.data));
      const p = me.data;
      setNurse(!!p.nurse_verified);
      setForm((f) => ({
        ...f, bio: p.bio || f.bio, years_exp: p.years_exp ? String(p.years_exp) : f.years_exp,
        languages: p.languages?.length ? p.languages : f.languages, gender: p.gender || f.gender,
        specialization_ids: (p.specializations || []).map((s) => s.id),
      }));
    }).catch(() => setErrors({ _: 'Could not load care types. Refresh the page to try again.' }));
  }, []);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; });
  };
  const toggle = (key, v) => set({ [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v] });
  const bioLen = form.bio.trim().length;

  const save = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (bioLen < MIN_BIO) e.bio = `Write at least ${MIN_BIO} characters (${bioLen}/${MIN_BIO}).`;
    if ((Number(form.hourly_rate) || 0) < MIN_RATE) e.hourly_rate = `At least KES ${MIN_RATE}.`;
    if (!form.specialization_ids.length) e.specialization_ids = 'Choose at least one.';
    if (!form.languages.length) e.languages = 'Choose at least one.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await caregiverApi.setupProfile({
        ...form, bio: form.bio.trim(), years_exp: Number(form.years_exp) || 0, hourly_rate: Number(form.hourly_rate),
        day_shift_rate: Number(form.day_shift_rate) || null, night_shift_rate: Number(form.night_shift_rate) || null,
      });
      await refreshUser();   // -> work areas
    } catch (err) {
      const d = err?.response?.data;
      setErrors(d && typeof d === 'object' && !d.detail
        ? Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(' ')]))
        : { _: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <Heading eyebrow="Step 1 of 3" title="Set up your profile">
        This is what families see when they find you. A clear, honest profile gets booked faster.
      </Heading>
      {setup.verified ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <ShieldCheck className="h-5 w-5" /> You're verified. Families will see a background-checked badge.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Thank you! We're checking your documents{setup.verification_expected_by ? ` and will get back to you by ${fmtDay(setup.verification_expected_by)}` : ' (2–3 days)'}. Set up your profile now so families can book you as soon as you're approved.
          </span>
        </div>
      )}
      <Field label="Bio" error={errors.bio} hint={`${bioLen}/${MIN_BIO} characters minimum`}>
        <textarea className="input min-h-[120px]" value={form.bio} onChange={(e) => set({ bio: e.target.value })}
          placeholder="e.g. I have cared for elderly clients with dementia and stroke recovery for 4 years. I'm patient, I cook, and I help with exercises." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Years of experience">
          <input className="input" inputMode="numeric" placeholder="0" value={form.years_exp}
            onChange={(e) => set({ years_exp: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
        </Field>
        <Field label="Hourly rate (KES)" error={errors.hourly_rate}>
          <input className="input" inputMode="numeric" value={form.hourly_rate}
            onChange={(e) => set({ hourly_rate: e.target.value.replace(/\D/g, '').slice(0, 5) })} />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-gray-500">Most caregivers charge KES 400–1,000 an hour. Tunza keeps 12.5%.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="12-hour day (KES)" hint="Optional">
          <input className="input" inputMode="numeric" placeholder="e.g. 3500" value={form.day_shift_rate}
            onChange={(e) => set({ day_shift_rate: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label="Overnight (KES)" hint="Optional">
          <input className="input" inputMode="numeric" placeholder="e.g. 3000" value={form.night_shift_rate}
            onChange={(e) => set({ night_shift_rate: e.target.value.replace(/\D/g, '') })} />
        </Field>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-gray-800">Care you offer</div>
        <div className="flex flex-wrap gap-2">
          {specs.map((s) => {
            const locked = s.nurse_only && !nurse;
            const on = form.specialization_ids.includes(s.id) && !locked;
            return (
              <button key={s.id} type="button" className={`${chip(on)} ${locked ? 'opacity-60' : ''}`}
                title={locked ? 'Only for caregivers whose nursing or CNA certificate Tunza has verified' : undefined}
                onClick={() => (locked ? null : toggle('specialization_ids', s.id))}>
                {locked ? <Lock className="h-3.5 w-3.5" /> : on && <Check className="h-3.5 w-3.5" />}{s.name}
              </button>
            );
          })}
        </div>
        {errors.specialization_ids && <p className="mt-2 text-xs font-medium text-red-600">{errors.specialization_ids}</p>}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-gray-800">Languages you speak</div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button key={l} type="button" className={chip(form.languages.includes(l))} onClick={() => toggle('languages', l)}>
              {form.languages.includes(l) && <Check className="h-3.5 w-3.5" />}{l}
            </button>
          ))}
        </div>
        {errors.languages && <p className="mt-2 text-xs font-medium text-red-600">{errors.languages}</p>}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-gray-800">Gender <span className="font-normal text-gray-400">(optional)</span></div>
        <div className="flex gap-2">
          {[['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
            <button key={v} type="button" className={chip(form.gender === v)} onClick={() => set({ gender: form.gender === v ? '' : v })}>{l}</button>
          ))}
        </div>
      </div>
      <Alert>{errors._}</Alert>
      <Button type="submit" size="lg" className="w-full" loading={busy}>Continue <ArrowRight className="h-4 w-4" /></Button>
    </form>
  );
}

// ── 3. Work areas ────────────────────────────────────────────────────────────
function Areas() {
  const { refreshUser } = useAuth();
  const [areas, setAreas] = useState([]);
  const [open, setOpen] = useState(new Set(['Nairobi']));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const has = (n) => areas.some((a) => a.toLowerCase() === n.toLowerCase());
  const toggle = (n) => { setAreas((a) => (has(n) ? a.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...a, n])); setError(''); };
  const flip = (c) => setOpen((o) => { const n = new Set(o); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const save = async () => {
    if (!areas.length) return setError('Choose at least one area you can travel to.');
    setBusy(true); setError('');
    try {
      const base = areas.map((n) => AREAS.find((a) => a.name.toLowerCase() === n.toLowerCase())).find(Boolean);
      await caregiverApi.updateMe({ work_areas: areas, location_name: areas[0], ...(base ? { latitude: base.lat, longitude: base.lng } : {}) });
      await refreshUser();   // -> availability
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <Heading eyebrow="Step 2 of 3" title="Where can you work?">
        Open a county and tap the areas you can get to easily. Families nearby will see you first.
      </Heading>
      <div className="space-y-2">
        {AREA_COUNTIES.map((c) => {
          const list = AREAS.filter((a) => countyOf(a.name) === c);
          if (!list.length) return null;
          const picked = list.filter((a) => has(a.name)).length;
          return (
            <div key={c} className="rounded-xl border border-gray-200 bg-white">
              <button type="button" onClick={() => flip(c)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="text-sm font-bold text-gray-900">{c}</span>
                <span className="text-xs font-semibold text-gray-500">{picked ? `${picked} chosen` : `${list.length} areas`}</span>
              </button>
              {open.has(c) && (
                <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
                  {list.map((a) => (
                    <button key={a.name} type="button" className={chip(has(a.name))} onClick={() => toggle(a.name)}>
                      {has(a.name) && <Check className="h-3.5 w-3.5" />}{a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500">You can change these any time from your profile.</p>
      <Alert>{error}</Alert>
      <Button size="lg" className="w-full" loading={busy} onClick={save} variant={areas.length ? 'primary' : 'secondary'}>
        {areas.length ? `Continue · ${areas.length} area${areas.length === 1 ? '' : 's'}` : 'Continue'} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── 4. Weekly availability ───────────────────────────────────────────────────
const PRESETS = [
  { label: 'Daytime', start: '08:00', end: '17:00' },
  { label: 'Morning', start: '06:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '18:00' },
  { label: 'Overnight', start: '19:00', end: '23:59' },
];

function Availability() {
  const { refreshUser } = useAuth();
  const [days, setDays] = useState([]);
  const [hours, setHours] = useState({ start: '08:00', end: '17:00' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggleDay = useCallback((i) => { setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort())); setError(''); }, []);

  const save = async () => {
    if (!days.length) return setError('Choose at least one day you can work.');
    if (hours.end <= hours.start) return setError('End time must be after start time.');
    setBusy(true); setError('');
    try {
      await caregiverApi.saveAvailability(days.map((day) => ({ day, start_time: hours.start, end_time: hours.end })));
      await refreshUser();   // setup done -> dashboard
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <Heading eyebrow="Step 3 of 3" title="When can you work?">
        Pick your days, then your usual hours. Families are matched to the times you choose. You can set different hours per day later in your profile.
      </Heading>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800">
          Days
          <span className="flex gap-3 text-xs">
            <button type="button" className="text-brand-700 hover:underline" onClick={() => setDays([0, 1, 2, 3, 4])}>Weekdays</button>
            <button type="button" className="text-brand-700 hover:underline" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>Every day</button>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS_LONG.map((d, i) => (
            <button key={d} type="button" onClick={() => toggleDay(i)}
              className={`rounded-xl border-2 py-2.5 text-sm font-bold ${days.includes(i) ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-gray-800">Hours</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className={chip(hours.start === p.start && hours.end === p.end)}
              onClick={() => setHours({ start: p.start, end: p.end })}>{p.label} · {p.start}–{p.end}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="From"><input type="time" className="input" value={hours.start} onChange={(e) => setHours((h) => ({ ...h, start: e.target.value }))} /></Field>
          <Field label="To"><input type="time" className="input" value={hours.end} onChange={(e) => setHours((h) => ({ ...h, end: e.target.value }))} /></Field>
        </div>
      </div>
      <Alert>{error}</Alert>
      <Button size="lg" className="w-full" loading={busy} onClick={save} variant={days.length ? 'primary' : 'secondary'}>
        <Check className="h-4 w-4" /> Finish setup
      </Button>
    </div>
  );
}
