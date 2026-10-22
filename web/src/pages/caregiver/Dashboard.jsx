import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarClock, UserCog, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingApi, careRequestApi, caregiverApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { BOOKING_STATUS } from '../../lib/constants';
import { careTypeLabel, caregiverNet, firstName, fmtTime, greeting, isSameDay, kes } from '../../lib/format';
import { Alert, Avatar, ButtonLink, Card, PageLoader, StatCard, StatusBadge } from '../../components/ui';
import { BookingCard } from '../shared/Bookings';
import JobCard from './JobCard';
import ApplyModal from './ApplyModal';
import { useAppliedJobs, withDistance } from './OpenJobs';
import VerificationBanner from '../../components/VerificationBanner';

function AvailabilityToggle({ profile, onChange }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const on = profile.is_available;
  const toggle = async () => {
    setSaving(true);
    setError('');
    try {
      await caregiverApi.updateMe({ is_available: !on });
      onChange({ ...profile, is_available: !on });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={toggle} disabled={saving}
        className={`flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm font-semibold transition ${on ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
        {on ? 'Available for new clients' : 'Not taking clients'}
        <span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const { applied, markApplied } = useAppliedJobs();
  const [applying, setApplying] = useState(null);

  const { data, setData, loading, error } = useAsync(async () => {
    const [profile, bookings, open] = await Promise.allSettled([caregiverApi.me(), bookingApi.list(), careRequestApi.open()]);
    if (profile.status === 'rejected') throw profile.reason;
    return {
      profile: profile.value.data,
      bookings: bookings.status === 'fulfilled' ? unwrap(bookings.value.data) : [],
      open: open.status === 'fulfilled' ? unwrap(open.value.data) : [],
    };
  }, []);

  const v = useMemo(() => {
    const bookings = data?.bookings ?? [];
    const now = new Date();
    const pending = bookings.filter((b) => b.status === 'pending').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const today = bookings
      .filter((b) => b.status === 'ongoing' || (b.status === 'accepted' && isSameDay(b.start_date, now)))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const monthNet = bookings
      .filter((b) => b.status === 'completed' && new Date(b.end_date).getMonth() === now.getMonth() && new Date(b.end_date).getFullYear() === now.getFullYear())
      .reduce((s, b) => s + caregiverNet(b.total_amount), 0);
    const nearby = withDistance(data?.open ?? [], data?.profile).slice(0, 2);
    return { pending, today, monthNet, nearby };
  }, [data]);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const p = data.profile;
  const missing = [
    !p.bio && 'a bio',
    !p.specializations?.length && 'your specialties',
    !p.location_name && 'your area',
    !p.availability?.length && 'weekly availability',
  ].filter(Boolean);

  const replaceBooking = (updated) =>
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)) }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{greeting()},</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{firstName(user.full_name)} 👋</h1>
        </div>
        <AvailabilityToggle profile={p} onChange={(profile) => setData((d) => ({ ...d, profile }))} />
      </div>

      <VerificationBanner />
      {missing.length > 0 && (
        <Card className="flex flex-col gap-4 border-brand-100 bg-brand-50/60 p-5 sm:flex-row sm:items-center">
          <div className="rounded-xl bg-white p-2.5 text-brand-700"><UserCog className="h-5 w-5" /></div>
          <div className="flex-1 text-sm">
            <div className="font-bold text-gray-900">Complete your profile to rank higher</div>
            <div className="text-gray-600">Add {missing.join(', ')}. Specialty and availability make up 55% of the match score.</div>
          </div>
          <ButtonLink to="/caregiver/profile" size="sm">Update profile</ButtonLink>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Bell} tone="amber" label="New requests" value={v.pending.length} sub="Waiting for your reply" />
        <StatCard icon={CalendarClock} tone="sky" label="Today" value={v.today.length} sub={v.today.length === 1 ? 'visit scheduled' : 'visits scheduled'} />
        <StatCard icon={Wallet} tone="green" label="Earned this month" value={kes(v.monthNet)} sub="After 12.5% platform fee" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">New booking requests</h2>
            <Link to="/caregiver/bookings" className="text-sm font-semibold text-brand-700 hover:underline">All bookings</Link>
          </div>
          {v.pending.length === 0 ? (
            <Card className="p-6 text-sm text-gray-500">No new requests. Keep your availability on so families can book you.</Card>
          ) : (
            <div className="space-y-4">
              {v.pending.slice(0, 3).map((b) => <BookingCard key={b.id} booking={b} role="caregiver" onChange={replaceBooking} />)}
            </div>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold">Today's schedule</h2>
            <Card className="divide-y divide-gray-100">
              {v.today.length === 0 && <div className="p-5 text-sm text-gray-500">Nothing scheduled for today.</div>}
              {v.today.map((b) => (
                <Link key={b.id} to="/caregiver/bookings" className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <div className="w-16 shrink-0 text-sm font-bold text-brand-700">{fmtTime(b.start_date)}</div>
                  <Avatar name={b.patient?.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{b.patient?.full_name}</div>
                    <div className="truncate text-xs text-gray-500">{careTypeLabel(b.care_type)}</div>
                  </div>
                  <StatusBadge map={BOOKING_STATUS} status={b.status} />
                </Link>
              ))}
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Open requests near you</h2>
              <Link to="/caregiver/jobs" className="text-sm font-semibold text-brand-700 hover:underline">See all</Link>
            </div>
            {v.nearby.length === 0 ? (
              <Card className="p-5 text-sm text-gray-500">No open requests right now.</Card>
            ) : (
              <div className="space-y-4">
                {v.nearby.map(({ r, d }) => (
                  <JobCard key={r.id} request={r} distance={d} applied={applied.has(r.id)} onApply={setApplying} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ApplyModal request={applying} defaultRate={p.hourly_rate} onClose={() => setApplying(null)}
        onApplied={(id) => { markApplied(id); setApplying(null); }} />
    </div>
  );
}
