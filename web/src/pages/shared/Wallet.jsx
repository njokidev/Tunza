import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, Info, Percent, Receipt, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingApi, paymentApi, unwrap } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { careTypeLabel, caregiverNet, fmtDate, kes, platformFee } from '../../lib/format';
import { Alert, Card, EmptyState, PageHeader, PageLoader, StatCard, Tabs } from '../../components/ui';

const sum = (list, f) => list.reduce((acc, b) => acc + f(b), 0);

/** Caregiver wallet, worked out on the server (payments/views.py WalletView). */
function CaregiverWallet() {
  const { data: w, loading, error } = useAsync(async () => (await paymentApi.wallet()).data, []);
  const [tab, setTab] = useState('available');
  if (loading) return <PageLoader />;
  const fmtPhone = (n) => (n && n.length === 12 ? `0${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : n || '');
  const rows = !w ? [] : tab === 'available' ? w.available_visits : tab === 'hold' ? w.on_hold_visits : w.payouts;
  return (
    <div>
      <PageHeader title="Wallet" subtitle="Your earnings after Tunza's 12.5% fee." />
      <Alert>{error}</Alert>
      {w && (
        <>
          <Card className="relative mb-6 overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-200"><WalletIcon className="h-4 w-4" /> Available for payout</div>
            <div className="mt-2 text-4xl font-extrabold tracking-tight">{kes(w.available)}</div>
            <div className="mt-1 text-sm text-brand-200">{w.payout_number ? `Paid to M-Pesa ${fmtPhone(w.payout_number)}` : 'Add an M-Pesa payout number on your profile'}</div>
          </Card>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <StatCard icon={Clock} label="On hold" value={kes(w.on_hold)} sub={`${w.hold_hours} h after each visit`} tone="amber" />
            <StatCard icon={Receipt} label="Upcoming" value={kes(w.upcoming)} sub={`${w.upcoming_count} confirmed`} tone="sky" />
            <StatCard icon={ArrowDownLeft} label="This month" value={kes(w.this_month)} tone="green" />
            <StatCard icon={ArrowUpRight} label="Paid out" value={kes(w.paid_out)} sub="all time" />
          </div>
          <Alert kind="info">Earnings stay on hold for {w.hold_hours} hours after a visit in case the family raises a problem, then become available. Tunza sends available money to your M-Pesa.</Alert>
          <div className="mt-6">
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'available', label: 'Available', count: w.available_visits.length },
              { value: 'hold', label: 'On hold', count: w.on_hold_visits.length },
              { value: 'payouts', label: 'Payouts', count: w.payouts.length },
            ]} />
          </div>
          <Card className="divide-y divide-gray-100">
            {rows.length === 0 ? <p className="p-5 text-sm text-gray-500">Nothing here yet.</p> : tab === 'payouts' ? rows.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <div className="flex-1"><div className="font-semibold text-gray-900">M-Pesa {p.mpesa_reference}</div>
                  <div className="text-xs text-gray-500">{fmtDate(p.created_at)} · {p.visits} visit{p.visits === 1 ? '' : 's'} · to {fmtPhone(p.phone)}</div></div>
                <div className="font-bold text-brand-700">{kes(p.amount)}</div>
              </div>
            )) : rows.map((v) => (
              <div key={v.booking_id} className="flex items-center gap-4 p-4">
                <div className="flex-1"><div className="font-semibold text-gray-900">Visit for {v.family}</div>
                  <div className="text-xs text-gray-500">{fmtDate(v.date)}{tab === 'hold' && v.available_at ? ` · available ${fmtDate(v.available_at)}` : ''}</div></div>
                <div className="text-right"><div className="font-bold text-emerald-700">+{kes(v.net)}</div><div className="text-xs text-gray-400">of {kes(v.gross)}</div></div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  if (user.role === 'caregiver') return <CaregiverWallet />;
  return <FamilyWallet />;
}

function FamilyWallet() {
  const { user } = useAuth();
  const isCaregiver = user.role === 'caregiver';
  const { data, loading, error } = useAsync(async () => unwrap((await bookingApi.list()).data), []);

  const s = useMemo(() => {
    const list = data ?? [];
    const completed = list.filter((b) => b.status === 'completed').sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    const committed = list.filter((b) => ['accepted', 'ongoing'].includes(b.status));
    const now = new Date();
    const thisMonth = completed.filter((b) => {
      const d = new Date(b.end_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const gross = (l) => sum(l, (b) => Number(b.total_amount || 0));
    return {
      completed,
      gross: gross(completed),
      net: sum(completed, (b) => caregiverNet(b.total_amount)),
      fees: sum(completed, (b) => platformFee(b.total_amount)),
      committedGross: gross(committed),
      committedNet: sum(committed, (b) => caregiverNet(b.total_amount)),
      monthNet: sum(thisMonth, (b) => caregiverNet(b.total_amount)),
      monthGross: gross(thisMonth),
    };
  }, [data]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={isCaregiver ? 'Earnings' : 'Wallet'}
        subtitle={isCaregiver ? 'What you have earned on Tunza, after the 12.5% platform fee.' : 'Your spending on care, visit by visit.'}
      />
      <Alert>{error}</Alert>

      <Card className="relative mb-6 overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-200">
          <WalletIcon className="h-4 w-4" /> {isCaregiver ? 'Total earned' : 'Total spent on care'}
        </div>
        <div className="mt-2 text-4xl font-extrabold tracking-tight">{kes(isCaregiver ? s.net : s.gross)}</div>
        <div className="mt-1 text-sm text-brand-200">
          {s.completed.length} completed visit{s.completed.length === 1 ? '' : 's'}
        </div>
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {isCaregiver ? (
          <>
            <StatCard icon={ArrowDownLeft} tone="green" label="This month" value={kes(s.monthNet)} sub={`${kes(s.monthGross)} before fees`} />
            <StatCard icon={Clock} tone="amber" label="Upcoming earnings" value={kes(s.committedNet)} sub="Accepted and in-progress visits" />
            <StatCard icon={Percent} tone="brand" label="Platform fees" value={kes(s.fees)} sub="12.5% of completed visits" />
          </>
        ) : (
          <>
            <StatCard icon={ArrowUpRight} tone="brand" label="Spent this month" value={kes(s.monthGross)} />
            <StatCard icon={Clock} tone="amber" label="Upcoming visits" value={kes(s.committedGross)} sub="Accepted and in progress" />
            <StatCard icon={Receipt} tone="green" label="Completed visits" value={s.completed.length} />
          </>
        )}
      </div>

      <h2 className="mb-3 text-lg font-bold">Transactions</h2>
      {s.completed.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions yet">
          {isCaregiver ? 'Completed visits will show here with your earnings.' : 'Payments for completed visits will show here.'}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">{isCaregiver ? 'Client' : 'Caregiver'}</th>
                <th className="px-5 py-3 font-semibold">Care</th>
                {isCaregiver && <th className="px-5 py-3 text-right font-semibold">Gross</th>}
                {isCaregiver && <th className="px-5 py-3 text-right font-semibold">Fee</th>}
                <th className="px-5 py-3 text-right font-semibold">{isCaregiver ? 'You earned' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {s.completed.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmtDate(b.end_date)}</td>
                  <td className="px-5 py-3 font-medium">{isCaregiver ? b.patient?.full_name : b.caregiver?.user?.full_name}</td>
                  <td className="px-5 py-3 text-gray-600">{careTypeLabel(b.care_type)}</td>
                  {isCaregiver && <td className="px-5 py-3 text-right text-gray-600">{kes(b.total_amount)}</td>}
                  {isCaregiver && <td className="px-5 py-3 text-right text-red-600">−{kes(platformFee(b.total_amount))}</td>}
                  <td className="px-5 py-3 text-right font-bold">{kes(isCaregiver ? caregiverNet(b.total_amount) : b.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-gray-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Figures are calculated from your completed bookings. Tunza keeps 12.5% of each visit; the caregiver receives 87.5%.
      </p>
    </div>
  );
}
