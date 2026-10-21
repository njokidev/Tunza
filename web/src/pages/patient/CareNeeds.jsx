import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Megaphone, Sparkles } from 'lucide-react';
import { careRequestApi, caregiverApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import {
  BUDGET_BANDS, CARE_RECIPIENTS, DAYS, FALLBACK_SPECIALIZATIONS, SCHEDULE_TYPES,
} from '../../lib/constants';
import { kes, recipientLabel, todayISODate } from '../../lib/format';
import { Alert, Button, Card, Field } from '../../components/ui';
import AreaPicker from '../../components/AreaPicker';

const STEPS = ['Who', 'What', 'When', 'Where', 'Budget'];

const initial = {
  care_recipient: '',
  care_types: [],
  special_needs: '',
  preferred_gender: '',
  preferred_language: '',
  schedule_type: 'one_time',
  start_date: '',
  end_date: '',
  hours_per_day: 8,
  days_of_week: [],
  location_name: '',
  latitude: null,
  longitude: null,
  address: '',
  budget_band: 1,
};

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>
      {on && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export default function CareNeeds() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = params.get('path') === 'open_request' ? 'open_request' : 'smart_match';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: specs } = useAsync(async () => unwrap((await caregiverApi.specializations()).data), []);
  const specOptions = specs?.length ? specs : FALLBACK_SPECIALIZATIONS;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, value) =>
    set({ [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value] });

  const stepError = useMemo(() => {
    const today = todayISODate();
    switch (step) {
      case 0: return form.care_recipient ? '' : 'Choose who needs care.';
      case 1: return form.care_types.length ? '' : 'Pick at least one type of care.';
      case 2:
        if (!form.start_date) return 'Choose a start date.';
        if (form.start_date < today) return 'Start date cannot be in the past.';
        if (form.end_date && form.end_date < form.start_date) return 'End date must be after the start date.';
        if (form.schedule_type === 'recurring' && !form.days_of_week.length) return 'Pick the days you need care.';
        if (form.hours_per_day < 1 || form.hours_per_day > 24) return 'Hours per day must be between 1 and 24.';
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
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

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
      navigate(
        path === 'smart_match' ? `/patient/requests/${data.id}/matches` : `/patient/requests/${data.id}/applications`,
        { state: { careRequest: data, justCreated: true } }
      );
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const band = BUDGET_BANDS[form.budget_band];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
          {path === 'smart_match' ? <Sparkles className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
          {path === 'smart_match' ? 'Smart Match' : 'Open request'}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Tell us about the care you need</h1>
        <p className="mt-1 text-gray-500">
          {path === 'smart_match'
            ? "We'll rank verified caregivers by how well they fit."
            : "Caregivers will see your request and apply with their rate."}
        </p>
      </div>

      <ol className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-700' : 'bg-gray-200'}`} />
            <div className={`mt-1.5 text-xs font-semibold ${i === step ? 'text-brand-700' : 'text-gray-400'}`}>{s}</div>
          </li>
        ))}
      </ol>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold">Who needs care?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CARE_RECIPIENTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set({ care_recipient: c.value })}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    form.care_recipient === c.value ? 'border-brand-700 bg-brand-50' : 'border-gray-200 hover:border-brand-200'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{c.label}</div>
                  <div className="text-xs text-gray-500">{c.hint}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">What kind of care?</h2>
              <p className="text-sm text-gray-500">Matched against caregiver specialties — this carries the most weight.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {specOptions.map((s) => (
                  <Chip key={s.id} on={form.care_types.includes(s.name)} onClick={() => toggle('care_types', s.name)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            </div>
            <Field label="Anything the caregiver should know?" hint="Medication, mobility, allergies, routines, pets at home…">
              <textarea className="input min-h-[100px]" value={form.special_needs}
                onChange={(e) => set({ special_needs: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred caregiver gender">
                <select className="input" value={form.preferred_gender} onChange={(e) => set({ preferred_gender: e.target.value })}>
                  <option value="">No preference</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </Field>
              <Field label="Preferred language">
                <select className="input" value={form.preferred_language} onChange={(e) => set({ preferred_language: e.target.value })}>
                  <option value="">No preference</option>
                  <option>English</option>
                  <option>Kiswahili</option>
                  <option>Kikuyu</option>
                  <option>Luo</option>
                  <option>Kamba</option>
                  <option>Luhya</option>
                  <option>Kalenjin</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">When do you need care?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {SCHEDULE_TYPES.map((s) => (
                  <button key={s.value} type="button" onClick={() => set({ schedule_type: s.value })}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      form.schedule_type === s.value ? 'border-brand-700 bg-brand-50' : 'border-gray-200 hover:border-brand-200'
                    }`}>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Start date">
                <input type="date" className="input" min={todayISODate()} value={form.start_date}
                  onChange={(e) => set({ start_date: e.target.value })} />
              </Field>
              <Field label="End date" hint="Optional">
                <input type="date" className="input" min={form.start_date || todayISODate()} value={form.end_date}
                  onChange={(e) => set({ end_date: e.target.value })} />
              </Field>
              <Field label="Hours per day">
                <input type="number" min={1} max={24} className="input" value={form.hours_per_day}
                  onChange={(e) => set({ hours_per_day: Number(e.target.value) })} />
              </Field>
            </div>
            {form.schedule_type !== 'one_time' && (
              <div>
                <div className="mb-2 text-sm font-semibold text-gray-800">Which days?</div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <Chip key={d} on={form.days_of_week.includes(i)} onClick={() => toggle('days_of_week', i)}>{d}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Where will care happen?</h2>
            <Field label="Area" hint="Used to rank caregivers by distance.">
              <AreaPicker value={form} onChange={(loc) => set(loc)} />
            </Field>
            <Field label="Estate, street or building" hint="Shared with the caregiver only after you book.">
              <input className="input" placeholder="e.g. Kileleshwa Gardens, Hse 12, Othaya Rd" value={form.address}
                onChange={(e) => set({ address: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">What's your hourly budget?</h2>
              <p className="text-sm text-gray-500">In KES per hour. Caregivers within budget score higher.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {BUDGET_BANDS.map((b, i) => (
                  <Chip key={b.label} on={form.budget_band === i} onClick={() => set({ budget_band: i })}>{b.label}</Chip>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5 text-sm">
              <div className="mb-3 font-bold text-gray-900">Summary</div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                <dt className="text-gray-500">Who</dt><dd className="font-medium">{recipientLabel(form.care_recipient)}</dd>
                <dt className="text-gray-500">Care</dt><dd className="font-medium">{form.care_types.join(', ')}</dd>
                <dt className="text-gray-500">When</dt>
                <dd className="font-medium">
                  {form.start_date}{form.end_date && ` → ${form.end_date}`} · {form.hours_per_day} hrs/day
                  {form.days_of_week.length > 0 && ` · ${[...form.days_of_week].sort((a, b) => a - b).map((d) => DAYS[d]).join(', ')}`}
                </dd>
                <dt className="text-gray-500">Where</dt><dd className="font-medium">{form.address}, {form.location_name}</dd>
                <dt className="text-gray-500">Budget</dt>
                <dd className="font-medium">
                  {band.max ? `${kes(band.min)} – ${kes(band.max)} / hr` : 'Flexible'}
                </dd>
              </dl>
            </div>
          </div>
        )}

        <div className="mt-6"><Alert>{error}</Alert></div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {isLast ? (
            <Button size="lg" onClick={submit} loading={submitting}>
              {path === 'smart_match' ? <><Sparkles className="h-4 w-4" /> Find my matches</> : <><Megaphone className="h-4 w-4" /> Post request</>}
            </Button>
          ) : (
            <Button size="lg" onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>
      </Card>
    </div>
  );
}
