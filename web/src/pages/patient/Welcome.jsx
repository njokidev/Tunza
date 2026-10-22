import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Users } from 'lucide-react';
import AuthShell from '../auth/AuthShell';
import AreaPicker from '../../components/AreaPicker';
import { Alert, Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { CARE_RECIPIENTS } from '../../lib/constants';

const RELATIONSHIPS = ['Mother', 'Father', 'Grandparent', 'Spouse', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];
const AGE_GROUPS = [{ value: 'child', label: 'Child', sub: 'Under 18' }, { value: 'adult', label: 'Adult', sub: '18–64' }, { value: 'elderly', label: 'Elderly', sub: '65+' }];
const chip = (on) => `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-brand-200'}`;

/** Family first-run setup (web): who the care is for + home area. Skippable. */
export default function Welcome() {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [r, setR] = useState({ is_self: null, name: '', relationship: '', age_group: '', care_recipient: '' });
  const [home, setHome] = useState({ location_name: '', latitude: null, longitude: null, address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user?.needs_onboarding) return <Navigate to="/patient" replace />;
  const set = (patch) => { setR((x) => ({ ...x, ...patch })); setError(''); };

  const next = () => {
    if (r.is_self === null) return setError('Choose who the care is for.');
    if (!r.is_self && !r.name.trim()) return setError('Add their name.');
    if (!r.age_group) return setError('Choose an age group.');
    setStep(1);
  };

  const finish = async (skip) => {
    setBusy(true); setError('');
    try {
      if (!skip) {
        const care = r.care_recipient || (r.age_group === 'child' ? 'child' : r.age_group === 'elderly' ? 'elderly' : '');
        await authApi.addRecipient({ ...r, care_recipient: care });
        if (home.location_name) {
          await authApi.updateMe({ home_area: home.location_name, home_address: home.address.trim(),
            home_latitude: home.latitude, home_longitude: home.longitude });
        }
      }
      const { data } = await authApi.completeOnboarding();
      setUser(data);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-gray-500">
        Step {step + 1} of 2
        <button type="button" onClick={() => finish(true)} className="normal-case tracking-normal text-sm text-brand-700 hover:underline">Skip for now</button>
      </div>
      {step === 0 ? (
        <div className="mt-4 space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Karibu, {user.full_name.split(' ')[0]}!</h2>
            <p className="mt-1 text-sm text-gray-500">Who is the care for? We'll use this to suggest the right caregivers.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: true, icon: User, t: 'Me' }, { v: false, icon: Users, t: 'Someone else' }].map(({ v, icon: Icon, t }) => (
              <button key={t} type="button" onClick={() => set({ is_self: v })}
                className={`rounded-2xl border-2 p-4 text-left ${r.is_self === v ? 'border-brand-700 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                <Icon className={`h-6 w-6 ${r.is_self === v ? 'text-brand-700' : 'text-gray-400'}`} />
                <div className="mt-2 text-sm font-bold text-gray-900">{t}</div>
              </button>
            ))}
          </div>
          {r.is_self === false && (
            <>
              <Field label="Their name"><input className="input" value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Mama Njeri" /></Field>
              <div>
                <div className="mb-2 text-sm font-semibold text-gray-700">Relationship to you</div>
                <div className="flex flex-wrap gap-2">{RELATIONSHIPS.map((x) => <button key={x} type="button" className={chip(r.relationship === x)} onClick={() => set({ relationship: x })}>{x}</button>)}</div>
              </div>
            </>
          )}
          {r.is_self !== null && (
            <>
              <div>
                <div className="mb-2 text-sm font-semibold text-gray-700">Age group</div>
                <div className="grid grid-cols-3 gap-2">
                  {AGE_GROUPS.map((a) => (
                    <button key={a.value} type="button" onClick={() => set({ age_group: a.value })}
                      className={`rounded-xl border-2 py-3 text-center ${r.age_group === a.value ? 'border-brand-700 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                      <div className="text-sm font-bold text-gray-900">{a.label}</div><div className="text-xs text-gray-500">{a.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-gray-700">What do they mostly need? <span className="font-normal text-gray-400">(optional)</span></div>
                <div className="flex flex-wrap gap-2">
                  {CARE_RECIPIENTS.filter((c) => c.value !== 'other').map((c) => (
                    <button key={c.value} type="button" className={chip(r.care_recipient === c.value)}
                      onClick={() => set({ care_recipient: r.care_recipient === c.value ? '' : c.value })}>{c.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <Alert>{error}</Alert>
          <Button size="lg" className="w-full" onClick={next}>Continue</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Where will care happen?</h2>
            <p className="mt-1 text-sm text-gray-500">Usually at home. You can change it for each booking.</p>
          </div>
          <AreaPicker value={home} onChange={(loc) => setHome((h) => ({ ...h, ...loc }))} />
          <Field label="Estate, street or building">
            <input className="input" value={home.address} onChange={(e) => setHome((h) => ({ ...h, address: e.target.value }))} placeholder="e.g. Kileleshwa Gardens, Hse 12, Othaya Rd" />
          </Field>
          <Alert kind="info">Your exact address is only shared with a caregiver after you book them.</Alert>
          <Alert>{error}</Alert>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button size="lg" className="flex-1" loading={busy} onClick={() => finish(false)}>Finish</Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
