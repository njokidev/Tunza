import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi, caregiverApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { AREAS, DAYS_LONG, EXPERIENCE_LEVELS, LANGUAGES } from '../../lib/constants';
import { fmtShortTime, kes } from '../../lib/format';
import { Alert, Avatar, Button, Card, Field, PageHeader, PageLoader, VerifiedBadge } from '../../components/ui';
import AreaPicker from '../../components/AreaPicker';

const levelFor = (years) => (years >= 5 ? 'senior' : years >= 2 ? 'mid' : 'junior');

export default function ProfileEditor() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';

  const { data, loading, error } = useAsync(async () => {
    const [profile, specs, avail] = await Promise.all([
      caregiverApi.me(), caregiverApi.specializations(), caregiverApi.availability(),
    ]);
    return { profile: profile.data, specs: unwrap(specs.data), availability: unwrap(avail.data) };
  }, []);

  const [form, setForm] = useState(null);
  const [account, setAccount] = useState({ full_name: user.full_name, phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ kind: '', text: '' });

  useEffect(() => {
    if (!data) return;
    const p = data.profile;
    setForm({
      bio: p.bio ?? '',
      years_exp: p.years_exp ?? 0,
      hourly_rate: p.hourly_rate ?? 500,
      is_available: p.is_available ?? true,
      id_number: '',
      location_name: p.location_name ?? '',
      latitude: p.latitude,
      longitude: p.longitude,
      specialization_ids: (p.specializations ?? []).map((s) => s.id),
      work_areas: p.work_areas?.length ? p.work_areas : (p.location_name ? [p.location_name] : []),
      languages: p.languages ?? [],
      gender: p.gender ?? '',
      day_shift_rate: p.day_shift_rate ? Math.round(Number(p.day_shift_rate)) : '',
      night_shift_rate: p.night_shift_rate ? Math.round(Number(p.night_shift_rate)) : '',
      payout_phone: p.payout_phone ?? '',
    });
  }, [data]);

  if (loading || (!form && !error)) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleSpec = (id) => set({
    specialization_ids: form.specialization_ids.includes(id)
      ? form.specialization_ids.filter((x) => x !== id)
      : [...form.specialization_ids, id],
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ kind: '', text: '' });
    try {
      const years = Number(form.years_exp) || 0;
      const payload = {
        ...form,
        years_exp: years,
        experience: levelFor(years),
        hourly_rate: Number(form.hourly_rate) || 0,
        day_shift_rate: Number(form.day_shift_rate) || null,
        night_shift_rate: Number(form.night_shift_rate) || null,
      };
      if (!payload.id_number) delete payload.id_number;
      await caregiverApi.updateMe(payload);
      if (account.full_name !== user.full_name || account.phone !== (user.phone ?? '')) {
        const { data: me } = await authApi.updateMe(account);
        setUser(me);
      }
      set({ id_number: '' });
      setStatus({ kind: 'success', text: 'Profile saved. Families will see your changes right away.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus({ kind: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={welcome ? 'Karibu! Set up your profile' : 'Your profile'}
        subtitle="This is what families see. A complete profile ranks higher in Smart Match."
      />
      <div className="mb-5 space-y-3">
        {welcome && !status.text && <Alert kind="info">Add your specialties, area, rate and availability so families can find you.</Alert>}
        <Alert kind={status.kind || 'error'}>{status.text}</Alert>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={account.full_name} src={user.avatar} size="lg" />
            <div>
              <div className="flex items-center gap-2 font-bold">{account.full_name} <VerifiedBadge verified={user.is_verified} /></div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className="input" required value={account.full_name} onChange={(e) => setAccount({ ...account, full_name: e.target.value })} />
            </Field>
            <Field label="Phone (M-Pesa)">
              <input className="input" type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-bold">Professional details</h2>
          <Field label="About you" hint="Your experience, the kind of clients you care for, languages you speak.">
            <textarea className="input min-h-[120px]" value={form.bio} onChange={(e) => set({ bio: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Years of experience" hint={EXPERIENCE_LEVELS.find((l) => l.value === levelFor(Number(form.years_exp)))?.label}>
              <input type="number" min={0} max={60} className="input" value={form.years_exp} onChange={(e) => set({ years_exp: e.target.value })} />
            </Field>
            <Field label="Hourly rate (KES)" hint={`Families pay ${kes(form.hourly_rate)}/hr; you receive ${kes(form.hourly_rate * 0.875)}`}>
              <input type="number" min={0} step={50} className="input" value={form.hourly_rate} onChange={(e) => set({ hourly_rate: e.target.value })} />
            </Field>
            <Field label="National ID number" hint={user.is_verified ? 'Verified' : 'Needed for verification'}>
              <input className="input" inputMode="numeric" placeholder={user.is_verified ? '••••••••' : 'e.g. 12345678'} value={form.id_number}
                onChange={(e) => set({ id_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </Field>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-800">Specialties</div>
            {data.specs.length === 0 ? (
              <p className="text-sm text-gray-500">No specialties set up yet — an admin can add them in Django admin.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.specs.map((s) => {
                  const on = form.specialization_ids.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSpec(s.id)} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>
                      {on && <Check className="h-3.5 w-3.5" />}{s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="12-hour day price (KES)" hint="Optional — used instead of hourly for full days">
              <input type="number" min={0} step={100} className="input" value={form.day_shift_rate} onChange={(e) => set({ day_shift_rate: e.target.value })} />
            </Field>
            <Field label="Overnight price (KES)" hint="Optional — used for overnight care">
              <input type="number" min={0} step={100} className="input" value={form.night_shift_rate} onChange={(e) => set({ night_shift_rate: e.target.value })} />
            </Field>
          </div>
          <Field label="Area you work from" hint="Used to measure distance to families.">
            <AreaPicker value={form} onChange={(loc) => set(loc)} />
          </Field>
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-800">All areas you'll take jobs in</div>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => {
                const on = form.work_areas.some((w) => w.toLowerCase() === a.name.toLowerCase());
                return (
                  <button key={a.name} type="button" className={`chip ${on ? 'chip-on' : 'chip-off'}`}
                    onClick={() => set({ work_areas: on ? form.work_areas.filter((w) => w.toLowerCase() !== a.name.toLowerCase()) : [...form.work_areas, a.name] })}>
                    {on && <Check className="h-3.5 w-3.5" />}{a.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-gray-800">Languages you speak</div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const on = form.languages.includes(l);
                return (
                  <button key={l} type="button" className={`chip ${on ? 'chip-on' : 'chip-off'}`}
                    onClick={() => set({ languages: on ? form.languages.filter((x) => x !== l) : [...form.languages, l] })}>
                    {on && <Check className="h-3.5 w-3.5" />}{l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gender" hint="Some families ask for a caregiver of a particular gender.">
              <select className="input" value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
                <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option>
              </select>
            </Field>
            <Field label="M-Pesa payout number" hint={form.payout_phone ? 'Earnings go to this number.' : 'Leave empty to be paid on your account phone.'}>
              <input className="input" type="tel" placeholder={account.phone || '0712 345 678'} value={form.payout_phone} onChange={(e) => set({ payout_phone: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded accent-brand-700" checked={form.is_available} onChange={(e) => set({ is_available: e.target.checked })} />
            I'm taking new clients
          </label>
        </Card>

        <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
          <Button type="submit" size="lg" loading={saving} className="shadow-lg"><Save className="h-4 w-4" /> Save profile</Button>
        </div>
      </form>

      <AvailabilityEditor initial={data.availability} />
    </div>
  );
}

function AvailabilityEditor({ initial }) {
  const [slots, setSlots] = useState(initial);
  const [draft, setDraft] = useState({ day: 0, start_time: '08:00', end_time: '17:00' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const takenDays = new Set(slots.map((s) => s.day));
  const freeDays = DAYS_LONG.map((d, i) => ({ d, i })).filter(({ i }) => !takenDays.has(i));

  useEffect(() => {
    if (takenDays.has(Number(draft.day)) && freeDays.length) setDraft((x) => ({ ...x, day: freeDays[0].i }));
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    setError('');
    if (draft.end_time <= draft.start_time) return setError('End time must be after start time.');
    setBusy(true);
    try {
      const { data } = await caregiverApi.addAvailability({ ...draft, day: Number(draft.day) });
      setSlots((s) => [...s, data].sort((a, b) => a.day - b.day));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await caregiverApi.removeAvailability(id);
      setSlots((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Card className="mt-6 p-6">
      <h2 className="font-bold">Weekly availability</h2>
      <p className="text-sm text-gray-500">Availability is 25% of the match score. Changes save immediately.</p>
      <ul className="mt-4 divide-y divide-gray-100">
        {slots.length === 0 && <li className="py-3 text-sm text-gray-500">No days added yet.</li>}
        {slots.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3 text-sm">
            <span className="w-28 font-semibold">{DAYS_LONG[s.day]}</span>
            <span className="flex-1 text-gray-600">{fmtShortTime(s.start_time)} – {fmtShortTime(s.end_time)}</span>
            <button onClick={() => remove(s.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${DAYS_LONG[s.day]}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {freeDays.length > 0 && (
        <div className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <select className="input" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })}>
            {freeDays.map(({ d, i }) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" className="input" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
          <input type="time" className="input" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
          <Button onClick={add} loading={busy} variant="secondary"><Plus className="h-4 w-4" /> Add</Button>
        </div>
      )}
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
    </Card>
  );
}
