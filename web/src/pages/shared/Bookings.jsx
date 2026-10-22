import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, Info, MapPin, MessageCircle, Navigation, Phone, Play, Star, X } from 'lucide-react';
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
    // Both need the 4-digit PIN the family gives the caregiver on the day.
    accepted: [{ status: 'ongoing', label: 'Check in & start', variant: 'primary', icon: Play, gps: true, pin: 'start' }],
    ongoing: [{ status: 'completed', label: 'Check out & end', variant: 'success', icon: CheckCircle2, gps: true, pin: 'end' }],
  },
  patient: {
    pending: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: X, confirm: 'Cancel this booking request?' }],
    accepted: [{ status: 'cancelled', label: 'Cancel', variant: 'danger-soft', icon: X, confirm: 'Cancel this confirmed booking?' }],
  },
};

/** Browser location for GPS check-in / check-out; null if refused or unavailable. */
const currentPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }),
    () => resolve(null), { enableHighAccuracy: true, timeout: 12000 });
});
const fmtPhone = (n) => (n && n.length === 12 ? `0${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : n || '');

export function BookingCard({ booking: b, role, onChange, onReview, onRateFamily }) {
  const { startChat, starting } = useStartChat();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const other = role === 'caregiver' ? b.patient : b.caregiver?.user;
  const actions = ACTIONS[role]?.[b.status] ?? [];

  const act = async (a) => {
    if (a.confirm && !window.confirm(a.confirm)) return;
    let pin;
    if (a.pin) {
      pin = window.prompt(a.pin === 'start'
        ? 'Enter the 4-digit START PIN the family gives you:'
        : 'Enter the 4-digit END PIN the family gives you. This releases your pay:');
      if (pin == null) return;
      pin = pin.replace(/\D/g, '');
    }
    setBusy(a.status);
    setError('');
    try {
      let extra = pin ? { pin } : {};
      if (a.gps) {
        const pos = await currentPosition();
        if (!pos && !window.confirm('We couldn’t get your location. Continue without GPS check-in/out? The family and Tunza will see it wasn’t recorded.')) {
          setBusy(null);
          return;
        }
        extra = { ...extra, ...(pos || {}) };
      }
      const { data } = await bookingApi.setStatus(b.id, a.status, extra);
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
              <span className="line-clamp-2">
                {b.address}
                {role === 'caregiver' && b.contact?.unlocked === false && (
                  <span className="text-xs text-gray-400"> · full address after {b.contact.unlocks_when === 'paid' ? 'payment' : 'you accept'}</span>
                )}
              </span>
            </div>
            {role === 'caregiver' && b.family_rating?.count > 0 && (
              <div className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />Family rated {b.family_rating.avg} by {b.family_rating.count} caregiver{b.family_rating.count === 1 ? '' : 's'}</div>
            )}
            {b.status === 'rejected' && b.decline_reason && (
              <div className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0 text-gray-400" />{b.decline_reason}</div>
            )}
            {b.check_in_at && (
              <div className={`flex items-center gap-2 ${b.check_in_flagged ? 'text-amber-700' : ''}`}>
                <Navigation className="h-4 w-4 shrink-0" />
                Checked in {fmtTime(b.check_in_at)}{b.check_in_distance_m != null ? ` (${b.check_in_distance_m} m from address)` : ' (no GPS)'}
                {b.check_out_at ? ` · out ${fmtTime(b.check_out_at)}` : ''}
              </div>
            )}
          </div>
          {b.special_needs && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{b.special_needs}</p>}
          {['pending', 'accepted', 'ongoing'].includes(b.status) && b.contact?.unlocked && (role === 'caregiver' ? b.contact.patient_phone : b.contact.caregiver_phone) && (
            <a href={`tel:+${role === 'caregiver' ? b.contact.patient_phone : b.contact.caregiver_phone}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
              <Phone className="h-4 w-4" /> Call {role === 'caregiver' ? 'the family' : 'your caregiver'} · {fmtPhone(role === 'caregiver' ? b.contact.patient_phone : b.contact.caregiver_phone)}
            </a>
          )}
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
          {role === 'caregiver' && b.status === 'completed' && !b.family_review && (
            <Button variant="secondary" size="sm" onClick={() => onRateFamily(b)}><Star className="h-4 w-4" /> Rate family</Button>
          )}
          {role === 'caregiver' && b.family_review && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Rated</span>}
          {role === 'patient' && b.review && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Reviewed</span>}
          {actions.map((a) => (
            <Button key={a.status} variant={a.variant} size="sm" onClick={() => act(a)} loading={busy === a.status} disabled={!!busy}>
              <a.icon className="h-4 w-4" /> {a.label}
            </Button>
          ))}
        </div>
      </div>
      {role === 'patient' && b.visit_pin?.pin && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <div>
            <div className="text-[11px] font-extrabold tracking-widest text-brand-800">{b.visit_pin.needed === 'start' ? 'START PIN' : 'END PIN'}</div>
            <div className="text-xs text-gray-600">
              {b.visit_pin.needed === 'start'
                ? `Give this to ${other?.full_name ?? 'your caregiver'} when they arrive.`
                : 'Give this only when the visit is finished. It releases their pay.'}
            </div>
          </div>
          <div className="font-mono text-3xl font-extrabold tracking-[0.3em] text-brand-800">{b.visit_pin.pin}</div>
        </div>
      )}
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

function RateFamilyModal({ booking, onClose, onDone }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!booking) return null;
  const submit = async () => {
    setSaving(true); setError('');
    try {
      const { data } = await ratingApi.rateFamily({ booking: booking.id, score, comment });
      onDone({ ...booking, family_review: data.id });
    } catch (e) { setError(errorMessage(e)); setSaving(false); }
  };
  return (
    <Modal open title={`Rate the ${booking.patient.full_name.split(' ')[0]} family`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Not now</Button><Button onClick={submit} loading={saving}>Submit rating</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Only Tunza and other caregivers see the average. The family doesn’t see your rating.</p>
        <StarInput value={score} onChange={setScore} />
        <Field label="Anything other caregivers should know?" hint="Optional">
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
  const [notice, setNotice] = useState(location.state?.booked ? 'Booking request sent. The caregiver has 30 minutes to accept — you’ll be notified either way.' : '');
  const [reviewing, setReviewing] = useState(null);
  const [ratingFamily, setRatingFamily] = useState(null);
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
                <BookingCard key={b.id} booking={b} role={role} onChange={replace} onReview={setReviewing} onRateFamily={setRatingFamily} />
              ))}
            </div>
          )}
        </>
      )}
      <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onDone={(b) => { replace(b); setReviewing(null); }} />
      <RateFamilyModal booking={ratingFamily} onClose={() => setRatingFamily(null)} onDone={(b) => { replace(b); setRatingFamily(null); }} />
    </div>
  );
}
