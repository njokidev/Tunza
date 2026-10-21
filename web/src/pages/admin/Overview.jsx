import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock, Banknote, CalendarCheck, CheckCircle2, Clock, Hourglass, Percent, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { BOOKING_CARE_TYPES } from '../../lib/constants';
import { kes } from '../../lib/format';
import { Alert, Card, PageHeader, PageLoader, StatCard } from '../../components/ui';
import { SplitBar, TrendChart, pct } from './shared';

const RANGES = [7, 30, 90];
const METRICS = [
  { value: 'bookings', label: 'Bookings created' },
  { value: 'signups', label: 'Sign-ups (families + caregivers)' },
  { value: 'gmv', label: 'Paid visit value' },
];
const STATUS_PARTS = [
  ['pending', 'Pending', '#F59E0B'],
  ['accepted', 'Accepted', '#0EA5E9'],
  ['ongoing', 'In progress', '#8F5FD3'],
  ['completed', 'Completed', '#10B981'],
  ['cancelled', 'Cancelled', '#9CA3AF'],
  ['rejected', 'Declined', '#EF4444'],
];

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState('bookings');
  const { data, loading, error } = useAsync(async () => (await adminApi.overview(days)).data, [days]);

  if (loading && !data) return <PageLoader label="Loading platform data…" />;

  const d = data;
  const rows = (d?.daily ?? []).map((r) => ({
    date: r.date,
    value: metric === 'bookings' ? r.bookings : metric === 'signups' ? r.families + r.caregivers : Number(r.gmv),
  }));
  const a = d?.attention ?? {};
  const attention = [
    { n: a.caregivers_to_verify, label: 'caregivers waiting for verification', to: '/admin/verification', icon: ShieldCheck },
    { n: a.requests_waiting_30m, label: 'booking requests with no reply after 30 min', to: '/admin/bookings?status=pending', icon: Hourglass },
    { n: a.late_starts, label: 'accepted visits not started 15 min after start time', to: '/admin/bookings?status=accepted', icon: AlarmClock },
    { n: a.overrunning, label: 'visits still in progress 1 h past their end time', to: '/admin/bookings?status=ongoing', icon: Clock },
    { n: a.payouts_due, label: 'caregivers with a payout due', to: '/admin/payouts', icon: Banknote },
  ].filter((x) => x.n > 0);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="How the Tunza pilot is running today."
        action={
          <div className="flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setDays(r)} aria-pressed={days === r}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${days === r ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600'}`}>
                {r} days
              </button>
            ))}
          </div>
        }
      />
      <div className="space-y-6">
        <Alert>{error}</Alert>
        {d?.pilot_note && <Alert kind="info">{d.pilot_note}</Alert>}

        <section aria-labelledby="attention">
          <h2 id="attention" className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Needs attention</h2>
          {attention.length === 0 ? (
            <Card className="flex items-center gap-3 p-4 text-sm text-gray-600">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Nothing waiting on you right now.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attention.map(({ n, label, to, icon: Icon }) => (
                <Link key={to + label} to={to}
                  className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                  <Icon className="h-5 w-5 shrink-0 text-amber-700" />
                  <span className="text-sm text-amber-900"><b className="text-lg tabular-nums">{n}</b> {label}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Totals">
          <StatCard icon={Users} label="Families" value={d?.users.families ?? '—'} sub={`${d?.users.suspended ?? 0} accounts suspended`} />
          <StatCard icon={ShieldCheck} tone="green" label="Verified caregivers" value={d?.users.caregivers_verified ?? '—'}
            sub={`${d?.users.caregivers_pending ?? 0} waiting for verification`} />
          <StatCard icon={CalendarCheck} tone="sky" label="Bookings" value={d?.bookings.total ?? '—'}
            sub={`${d?.bookings.by_status.completed ?? 0} completed`} />
          <StatCard icon={Wallet} label="Paid visit value (GMV)" value={kes(d?.money.gmv)} sub="All time" />
          <StatCard icon={Percent} tone="green" label="Tunza commission" value={kes(d?.money.commission)} sub="12.5% of paid visits" />
          <StatCard icon={Banknote} tone="amber" label="Owed to caregivers" value={kes(d?.money.owed_to_caregivers)}
            sub={`${kes(d?.money.paid_out)} paid out so far`} />
        </section>

        <Card className="p-5">
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Chart metric">
            {METRICS.map((m) => (
              <button key={m.value} onClick={() => setMetric(m.value)} aria-pressed={metric === m.value}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${metric === m.value ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'text-gray-600 ring-gray-200 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <TrendChart rows={rows} money={metric === 'gmv'} label={`${METRICS.find((m) => m.value === metric).label}, last ${days} days`} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-gray-900">Marketplace health</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Metric label="Acceptance rate" value={pct(d?.bookings.acceptance_rate)} hint="Requests caregivers accepted" />
              <Metric label="Cancellation rate" value={pct(d?.bookings.cancellation_rate)} hint="Of all bookings" />
              <Metric label="Repeat families" value={pct(d?.bookings.repeat_family_rate)} hint="Families with 2+ bookings" />
              <Metric label="Average rating" value={d?.quality.avg_rating ? `${d.quality.avg_rating} ★` : '—'} hint={`${d?.quality.reviews ?? 0} reviews`} />
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-gray-900">Bookings by status</h2>
            <SplitBar parts={STATUS_PARTS.map(([k, label, color]) => ({ label, color, value: d?.bookings.by_status[k] ?? 0 }))} />
            <h3 className="mb-3 mt-6 text-sm font-bold text-gray-700">By care type</h3>
            <ul className="space-y-2">
              {BOOKING_CARE_TYPES.map((c) => {
                const n = d?.bookings.by_care_type[c.value] ?? 0;
                const max = Math.max(1, ...Object.values(d?.bookings.by_care_type ?? {}));
                return (
                  <li key={c.value} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-sm">
                    <span className="truncate text-gray-600">{c.label}</span>
                    <span className="h-2 rounded-full bg-gray-100"><span className="block h-2 rounded-full bg-brand-400" style={{ width: `${(n / max) * 100}%` }} /></span>
                    <b className="text-right tabular-nums text-gray-900">{n}</b>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">{value}</dd>
      <dd className="text-xs text-gray-400">{hint}</dd>
    </div>
  );
}
