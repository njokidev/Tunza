import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthShell from './AuthShell';
import { Alert, Button, Field } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';

export default function Login() {
  const { user, login, booting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!booting && user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const me = await login(form.email, form.password);
      const from = location.state?.from;
      const home = homeFor(me.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? 'Incorrect email or password.' : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Welcome back</h2>
      <p className="mt-1 text-sm text-gray-500">Log in to your Tunza account.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {location.state?.expired && !error && <Alert kind="info">Your session expired. Please log in again.</Alert>}
        <Alert>{error}</Alert>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
              aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Log in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        New to Tunza? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
