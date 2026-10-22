import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, PageLoader } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { authApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';

export const needsPhoneVerification = (u) => u && u.role !== 'admin' && u.phone_verification_required && !u.phone_verified;

/** Text a 6-digit code to the account's phone and confirm it. */
export default function VerifyPhone() {
  const { user, booting, setUser, logout } = useAuth();
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [phone, setPhone] = useState('');

  const send = useCallback(async () => {
    setError('');
    try {
      const { data } = await authApi.sendPhoneCode();
      setSentTo(data.phone || ''); setDevCode(data.dev_code || ''); setWait(60);
    } catch (err) {
      const d = err.response?.data;
      if (d?.code === 'too_soon') setWait(Number((d.detail.match(/(\d+) seconds/) || [])[1]) || 60);
      else setError(errorMessage(err));
    }
  }, []);

  useEffect(() => { if (needsPhoneVerification(user)) send(); }, [user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (booting) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!needsPhoneVerification(user)) return <Navigate to={homeFor(user.role)} replace />;

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await authApi.verifyPhone(code);
      setUser(data);
    } catch (err) { setError(errorMessage(err)); setCode(''); } finally { setBusy(false); }
  };

  const changeNumber = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await authApi.updateMe({ phone });
      setUser(data); setChanging(false); setWait(0);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Verify your phone</h2>
      <p className="mt-1 text-sm text-gray-500">
        {sentTo ? `We sent a 6-digit code to ${sentTo}.` : 'Sending your code…'} Your number is used for M-Pesa and to keep your account safe.
      </p>
      <form onSubmit={verify} className="mt-8 space-y-4">
        <Alert>{error}</Alert>
        {devCode && <Alert kind="info">Test mode (no SMS service set up): your code is {devCode}</Alert>}
        <Field label="6-digit code">
          <input className="input text-center font-mono text-xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" autoFocus
            maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>Verify</Button>
      </form>
      <div className="mt-4 flex justify-between text-sm font-semibold">
        <button type="button" disabled={wait > 0} onClick={send} className="text-brand-700 hover:underline disabled:text-gray-400 disabled:no-underline">
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
        <button type="button" onClick={() => setChanging((v) => !v)} className="text-brand-700 hover:underline">Change number</button>
      </div>
      {changing && (
        <form onSubmit={changeNumber} className="mt-4 flex gap-2">
          <input className="input flex-1" type="tel" required placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" variant="secondary" loading={busy}>Use this</Button>
        </form>
      )}
      <p className="mt-8 text-center"><button type="button" onClick={logout} className="text-xs text-gray-500 underline">Sign out</button></p>
    </AuthShell>
  );
}
