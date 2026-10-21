import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, MapPin, MessageCircle, Play, Star, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingApi, ratingApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { BOOKING_STATUS } from '../../lib/constants';
import { careTypeLabel, caregiverNet, fmtDay, fmtTime, isSameDay, kes } from '../../lib/format';
import {
  Alert, Avatar, Button, ButtonLink, Card, EmptyState, Field, Modal, PageHeader, PageLoader, StarInput, StatusBadge, Tabs,
} from '../../components/ui';
import { useStartChat } from '../patient/CaregiverProfile';

const TABS = {
  pending: ['pending'],
  upcoming: ['accepted'],
  active: ['ongoing'],
  past: ['completed', 'cancelled', 'rejected'],
};

// What each role can do from each status (mirrors UpdateBookingStatusView).
const ACTIONS = {
  caregiver: {
    pending: [
      { status: 'rejected', label: 'Decline', variant: 'ghost', icon: X, confirm: 'Decline this booking request?' },
      { status: 'accepted', label: 'Accept', variant: 'primary', icon: CheckCircle2 },
    ],
    accepted: [{ status: 'ongoing', label: 'Start service', variant: 'primary', icon: Play }],
    ongoing: [{ status: 'completed', label: 'End service', variant: 'success', icon: CheckCircle2, confirm: 'Mark this visit as complete? Payment will be released to you.' }],
  },
  patient: {
    pending: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: X, confirm: 'Cancel this booking request?' }],
    accepted: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: X, confirm: 'Cancel this confirmed booking?' }],
  },
};

export function BookingCard({ booking: b, role, onChange, onReview }) {
  const { startChat, starting } = useStartChat();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const other = role === 'caregiver' ? b.patient : b.caregiver?.user;
  const actions = ACTIONS[role]?.[b.status] ?? [];

  const act = async (a) => {
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(a.status);
    setError('');
    try {
      const { data } = await bookingApi.setStatus(b.id, a.status);
      onChange(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <Avatar name={other?.full_name} src={other?.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate font-bold text-gray-900">{other?.full_name}</h3>
            <StatusBadge map={BOOKING_STATUS} status={b.status} />
          </div>
          <p className="text-sm font-medium text-brand-700">{careTypeLabel(b.care_type)}</p>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              {fmtDay(b.start_date)}, {fmtTime(b.start_date)} – {isSameDay(b.start_date, b.end_date) ? '' : `${fmtDay(b.end_date)}, `}{fmtTime(b.end_date)}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{b.address}</span>
            </div>
          </div>
          {b.special_needs && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{b.special_needs}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div>
          <div className="text-lg font-extrabold text-gray-900">
            {kes(role === 'caregiver' ? caregiverNet(b.total_amount) : b.total_amount)}
          </div>
          <div className="text-xs text-gray-500">
            {role === 'caregiver' ? `You earn · ${kes(b.total_amount)} before 12.5% fee` : b.is_paid ? 'Paid' : 'Estimated total'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {other && b.status !== 'rejected' && (
            <Button variant="outline" size="sm" onClick={() => startChat(other.id)} loading={starting} aria-label="Message">
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          {role === 'patient' && b.status === 'completed' && !b.review && (
            <Button variant="secondary" size="sm" onClick={() => onReview(b)}><Star className="h-4 w-4" /> Leave review</Button>
          )}
          {role === 'patient' && b.review && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Reviewed</span>}
          {actions.map((a) => (
            <Button key={a.status} variant={a.variant} size="sm" onClick={() => act(a)} loading={busy === a.status} disabled={!!busy}>
              <a.icon className="h-4 w-4" /> {a.label}
            </Button>
          ))}
        </div>
      </div>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
    </Card>
  );
}

function ReviewModal({ booking, onClose, onDone }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!booking) return null;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await ratingApi.create({ caregiver: booking.caregiver.id, booking: booking.id, score, comment });
      onDone({ ...booking, review: data.id });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal open title={`How was ${booking.caregiver.user.full_name.split(' ')[0]}?`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Not now</Button><Button onClick={submit} loading={saving}>Submit review</Button></>}>
      <div className="space-y-4">
        <StarInput value={score} onChange={setScore} />
        <Field label="Tell other families about the care" hint="Optional">
          <textarea className="input min-h-[100px]" value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const role = user.role;
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.booked ? 'Booking request sent. You’ll be notified when the caregiver responds.' : '');
  const [reviewing, setReviewing] = useState(null);
  const { data, setData, loading, error } = useAsync(async () => unwrap((await bookingApi.list()).data), []);

  const grouped = useMemo(() => {
    const out = Object.fromEntries(Object.keys(TABS).map((k) => [k, []]));
    for (const b of data ?? []) {
      const key = Object.keys(TABS).find((k) => TABS[k].includes(b.status));
      if (key) out[key].push(b);
    }
    const asc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
    ['pending', 'upcoming', 'active'].forEach((k) => out[k].sort(asc));
    out.past.sort((a, b) => -asc(a, b));
    return out;
  }, [data]);

  const defaultTab = ['active', 'pending', 'upcoming'].find((k) => grouped[k].length) ?? 'upcoming';
  const [tab, setTab] = useState(null);
  const current = tab ?? defaultTab;
  const replace = (updated) => setData((list) => list.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));

  const tabs = [
    { value: 'pending', label: role === 'caregiver' ? 'Requests' : 'Awaiting reply', count: grouped.pending.length },
    { value: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
    { value: 'active', label: 'In progress', count: grouped.active.length },
    { value: 'past', label: 'Past', count: 0 },
  ];

  return (
    <div>
      <PageHeader
        title={role === 'caregiver' ? 'My bookings' : 'Bookings'}
        subtitle={role === 'caregiver' ? 'Accept requests, start and end your visits.' : 'Track your care visits and leave reviews.'}
        action={role === 'patient' && <ButtonLink to="/patient/care-needs?path=smart_match">Book care</ButtonLink>}
      />
      <div className="mb-4 space-y-3">
        {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Alert>{error}</Alert>
      </div>
      {loading ? <PageLoader /> : (
        <>
          <Tabs tabs={tabs} value={current} onChange={setTab} />
          {grouped[current].length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Nothing here yet">
              {role === 'caregiver'
                ? 'New booking requests from families will show up under Requests.'
                : 'Find a caregiver with Smart Match or Browse to make your first booking.'}
            </EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {grouped[current].map((b) => (
                <BookingCard key={b.id} booking={b} role={role} onChange={replace} onReview={setReviewing} />
              ))}
            </div>
          )}
        </>
      )}
      <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onDone={(b) => { replace(b); setReviewing(null); }} />
    </div>
  );
}
