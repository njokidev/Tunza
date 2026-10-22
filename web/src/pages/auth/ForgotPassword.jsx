import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, PasswordChecklist, PasswordInput } from '../../components/ui';
import { authApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { passwordChecks } from '../../lib/password';

/** Phone (or email) → SMS code → new password. */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState(location.state?.identifier || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checks = passwordChecks(password, {});

  const request = async (e) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await authApi.resetRequest(identifier.trim());
      setSentTo(data.phone || ''); setDevCode(data.dev_code || '');
      setStep(1);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const confirm = async (e) => {
    e.preventDefault();
    if (!checks.every((c) => c.ok)) return setError('Your new password doesn’t meet all the requirements.');
    setBusy(true); setError('');
    try {
      await authApi.resetConfirm({ identifier: identifier.trim(), code, new_password: password });
      navigate('/login', { replace: true, state: { reset: true } });
    } catch (err) {
      const d = err.response?.data;
      setError(d?.new_password ? [].concat(d.new_password).join(' ') : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Reset your password</h2>
      <p className="mt-1 text-sm text-gray-500">
        {step === 0 ? "Enter your phone number or email. We'll text a code to the phone on your account."
          : sentTo ? `Enter the code we sent to ${sentTo}.` : 'If an account uses these details, we sent a code to its phone.'}
      </p>
      {step === 0 ? (
        <form onSubmit={request} className="mt-8 space-y-4">
          <Alert>{error}</Alert>
          <Field label="Phone or email">
            <input className="input" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0712 345 678 or you@example.com" />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send code</Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-8 space-y-4">
          <Alert>{error}</Alert>
          {devCode && <Alert kind="info">Test mode (no SMS service set up): your code is {devCode}</Alert>}
          <Field label="6-digit code">
            <input className="input text-center font-mono text-xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="New password">
            <PasswordInput required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordChecklist checks={checks} touched={password.length > 0} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Change password</Button>
          <button type="button" onClick={request} className="w-full text-sm font-semibold text-brand-700 hover:underline">Send a new code</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-gray-600"><Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link></p>
    </AuthShell>
  );
}
