import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BadgeCheck, CheckCircle2, Circle, Eye, EyeOff, Loader2, Star, X, XCircle } from 'lucide-react';
import { initials } from '../lib/format';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm shadow-brand-900/10',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  outline: 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};
const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const btnClass = (variant = 'primary', size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition
   disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4
   focus-visible:ring-brand-200 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

export function Button({ variant, size, loading, className = '', children, disabled, type = 'button', ...rest }) {
  return (
    <button type={type} className={btnClass(variant, size, className)} disabled={loading || disabled} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant, size, className = '', children, ...rest }) {
  return (
    <Link to={to} className={btnClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-semibold text-gray-800">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

/** Password input with a show/hide (eye) toggle. Extra props go to the <input>. */
export function PasswordInput({ className = '', invalid, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        className={`input pr-11 ${invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Live checklist of password rules: grey until typed, then green or red. */
export function PasswordChecklist({ checks, touched }) {
  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {checks.map((c) => {
        const Icon = !touched ? Circle : c.ok ? CheckCircle2 : XCircle;
        const tone = !touched ? 'text-gray-400' : c.ok ? 'text-emerald-600' : 'text-red-600';
        return (
          <li key={c.key} className={`flex items-center gap-1.5 text-xs ${tone}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{c.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Passwords match" / "don't match" line under the confirm field. */
export function PasswordMatch({ password, confirm }) {
  if (!confirm) return null;
  const ok = password === confirm;
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}`} aria-live="polite">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {ok ? 'Passwords match' : "Passwords don't match"}
    </p>
  );
}

export function Spinner({ className = 'h-6 w-6' }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-gray-500">
      <Spinner className="h-8 w-8" />
      {label}
    </div>
  );
}

export function Alert({ kind = 'error', children, onClose }) {
  if (!children) return null;
  const styles = kind === 'error'
    ? 'border-red-200 bg-red-50 text-red-800'
    : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-brand-200 bg-brand-50 text-brand-800';
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`} role="alert">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Badge({ className = 'bg-gray-100 text-gray-700 ring-gray-200', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ map, status }) {
  const s = map[status] ?? { label: status, className: undefined };
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function VerifiedBadge({ verified, compact }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700" title="Identity verified by Tunza">
      <BadgeCheck className="h-4 w-4" />
      {!compact && 'Verified'}
    </span>
  );
}

export function Avatar({ name, src, size = 'md' }) {
  const dims = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' }[size];
  if (src) return <img src={src} alt={name} className={`${dims} shrink-0 rounded-full object-cover`} />;
  return (
    <div className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

export function Rating({ value, count }) {
  const v = Number(value || 0);
  if (!count) return <span className="text-xs font-medium text-gray-500">New on Tunza</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-800">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {v.toFixed(1)}
      <span className="font-normal text-gray-500">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star className={`h-8 w-8 transition ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded-2xl bg-brand-50 p-3 text-brand-700">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-bold text-gray-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-gray-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </Card>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            value === t.value ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t.label}
          {t.count > 0 && (
            <span className={`rounded-full px-1.5 text-xs ${value === t.value ? 'bg-brand-100' : 'bg-gray-200'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
