import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { HeartHandshake, Users } from 'lucide-react';
import AuthShell from './AuthShell';
import { Alert, Button, Field, PasswordChecklist, PasswordInput, PasswordMatch } from '../../components/ui';
import { passwordChecks } from '../../lib/password';
import { useAuth, homeFor } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';

const ROLES = [
  { value: 'patient', title: 'I need care', text: 'For myself or a loved one', icon: Users },
  { value: 'caregiver', title: "I'm a caregiver", text: 'Find clients and get paid', icon: HeartHandshake },
];

// Accept 07xx / 01xx / 2547xx / +2547xx and send as 2547… (the format M-Pesa uses)
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export default function Register() {
  const { user, register, booting } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ role: 'patient', full_name: '', email: '', phone: '', password: '', password2: '', accept_terms: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!booting && user) return <Navigate to={homeFor(user.role)} replace />;

  const checks = passwordChecks(form.password, form);
  const passwordOk = checks.every((c) => c.ok);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const phone = normalisePhone(form.phone);
    if (!phone) return setError('Enter a valid Kenyan phone number, e.g. 0712 345 678.');
    if (!passwordOk) return setError('Your password doesn’t meet all the requirements below.');
    if (form.password !== form.password2) return setError('Passwords don’t match. Use the eye icon to check what you typed.');
    if (!form.accept_terms) return setError('Please accept the Terms of Service and Privacy Policy to continue.');
    setLoading(true);
    try {
      const me = await register({ ...form, phone });
      navigate(me.phone_verification_required && !me.phone_verified ? '/verify-phone'
        : me.role === 'caregiver' ? '/caregiver/profile?welcome=1' : '/welcome', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Create your account</h2>
      <p className="mt-1 text-sm text-gray-500">It takes less than a minute.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ value, title, text, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, role: value })}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                form.role === value ? 'border-brand-700 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-200'
              }`}
            >
              <Icon className={`h-6 w-6 ${form.role === value ? 'text-brand-700' : 'text-gray-400'}`} />
              <div className="mt-2 text-sm font-bold text-gray-900">{title}</div>
              <div className="text-xs text-gray-500">{text}</div>
            </button>
          ))}
        </div>

        <Alert>{error}</Alert>

        <Field label="Full name">
          <input className="input" required autoComplete="name" placeholder="Wanjiru Kamau" value={form.full_name} onChange={set('full_name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone (M-Pesa)" hint="We'll text you a code to verify it.">
            <input className="input" type="tel" required autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={set('phone')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password">
            <PasswordInput required autoComplete="new-password" value={form.password} onChange={set('password')}
              invalid={form.password && !passwordOk} />
            <PasswordChecklist checks={checks} touched={form.password.length > 0} />
          </Field>
          <Field label="Confirm password">
            <PasswordInput required autoComplete="new-password" value={form.password2} onChange={set('password2')}
              invalid={form.password2 && form.password !== form.password2} />
            <PasswordMatch password={form.password} confirm={form.password2} />
          </Field>
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={form.accept_terms}
            onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} />
          <span>
            I agree to Tunza's <Link to="/terms" target="_blank" className="font-semibold text-brand-700 underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" target="_blank" className="font-semibold text-brand-700 underline">Privacy Policy</Link>, including how my data is used.
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {form.role === 'caregiver' ? 'Join as a caregiver' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
