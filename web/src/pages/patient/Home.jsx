import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Megaphone, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../lib/useAsync';
import { bookingApi, careRequestApi, unwrap } from '../../api/endpoints';
import { Avatar, ButtonLink, Card, StatusBadge } from '../../components/ui';
import { BOOKING_STATUS, REQUEST_STATUS, TAGLINE } from '../../lib/constants';
import { firstName, fmtDate, fmtDay, fmtTime, greeting, recipientLabel } from '../../lib/format';

const PATHS = [
  {
    to: '/patient/care-needs?path=smart_match',
    icon: Sparkles,
    title: 'Smart Match',
    text: 'Tell us your care needs. We rank verified caregivers by fit — specialty, schedule, distance and budget.',
    cta: 'Find my matches',
    featured: true,
  },
  {
    to: '/patient/browse',
    icon: Search,
    title: 'Browse caregivers',
    text: 'Search and filter by specialty, rate and rating. Book the one you like.',
    cta: 'Browse',
  },
  {
    to: '/patient/care-needs?path=open_request',
    icon: Megaphone,
    title: 'Post an open request',
    text: 'Publish your need and let caregivers apply with their rate.',
    cta: 'Post a request',
  },
];

export default function PatientHome() {
  const { user } = useAuth();
  const { data } = useAsync(async () => {
    const [reqs, bks] = await Promise.allSettled([careRequestApi.mine(), bookingApi.list()]);
    return {
      requests: reqs.status === 'fulfilled' ? unwrap(reqs.value.data) : [],
      bookings: bks.status === 'fulfilled' ? unwrap(bks.value.data) : [],
    };
  }, []);

  const upcoming = (data?.bookings ?? [])
    .filter((b) => ['pending', 'accepted', 'ongoing'].includes(b.status))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 3);
  const requests = (data?.requests ?? []).slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-10 text-white sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full bg-brand-500/50 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold text-brand-200">{greeting()}, {firstName(user.full_name)}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{TAGLINE}</h1>
          <p className="mt-3 text-brand-100">Who are we caring for today? Start with Smart Match and see your best-fit caregivers in seconds.</p>
          <ButtonLink to="/patient/care-needs?path=smart_match" variant="secondary" size="lg" className="mt-6 bg-white text-brand-800 hover:bg-brand-50">
            <Sparkles className="h-5 w-5" /> Start Smart Match
          </ButtonLink>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Three ways to find care</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PATHS.map(({ to, icon: Icon, title, text, cta, featured }) => (
            <Link key={title} to={to} className="group">
              <Card className={`flex h-full flex-col p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-lg ${featured ? 'ring-2 ring-brand-700' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-2.5 ${featured ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-700'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {featured && <span className="text-xs font-bold uppercase tracking-wide text-brand-700">Recommended</span>}
                </div>
                <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-gray-500">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                  {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Upcoming care</h2>
            <Link to="/patient/bookings" className="text-sm font-semibold text-brand-700 hover:underline">All bookings</Link>
          </div>
          <Card className="divide-y divide-gray-100">
            {upcoming.length === 0 && (
              <div className="flex items-center gap-3 p-5 text-sm text-gray-500">
                <CalendarCheck className="h-5 w-5 text-gray-300" /> No upcoming visits yet.
              </div>
            )}
            {upcoming.map((b) => (
              <Link key={b.id} to="/patient/bookings" className="flex items-center gap-4 p-4 hover:bg-gray-50">
                <Avatar name={b.caregiver?.user?.full_name} src={b.caregiver?.user?.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{b.caregiver?.user?.full_name}</div>
                  <div className="text-xs text-gray-500">{fmtDay(b.start_date)} · {fmtTime(b.start_date)}</div>
                </div>
                <StatusBadge map={BOOKING_STATUS} status={b.status} />
              </Link>
            ))}
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">My care requests</h2>
            <Link to="/patient/requests" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          <Card className="divide-y divide-gray-100">
            {requests.length === 0 && (
              <div className="p-5 text-sm text-gray-500">You haven't posted any care needs yet.</div>
            )}
            {requests.map((r) => (
              <Link
                key={r.id}
                to={r.discovery_path === 'open_request' ? `/patient/requests/${r.id}/applications` : `/patient/requests/${r.id}/matches`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{recipientLabel(r.care_recipient)}</div>
                  <div className="text-xs text-gray-500">
                    {r.discovery_path === 'open_request' ? 'Open request' : 'Smart Match'} · from {fmtDate(r.start_date)}
                    {r.location_name && ` · ${r.location_name}`}
                  </div>
                </div>
                <StatusBadge map={REQUEST_STATUS} status={r.status} />
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
