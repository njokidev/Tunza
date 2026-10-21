import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Info } from 'lucide-react';
import { bookingApi, caregiverApi, careRequestApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { BOOKING_CARE_TYPES, RECIPIENT_TO_CARE_TYPE } from '../../lib/constants';
import { estimateAmount, kes, nairobiISO, todayISODate } from '../../lib/format';
import { Alert, Avatar, Button, Card, Field, PageLoader, Rating, VerifiedBadge } from '../../components/ui';

const addHours = (time, hours) => {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h + hours, 23);
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function RequestBooking() {
  const { caregiverId } = useParams();
  const [params] = useSearchParams();
  const requestId = params.get('request');
  const location = useLocation();
  const navigate = useNavigate();

  const { data, loading, error: loadError } = useAsync(async () => {
    const caregiver = location.state?.caregiver ?? (await caregiverApi.get(caregiverId)).data;
    let careRequest = location.state?.careRequest ?? null;
    if (requestId && !careRequest) {
      careRequest = unwrap((await careRequestApi.mine()).data).find((r) => r.id === requestId) ?? null;
    }
    return { caregiver, careRequest };
  }, [caregiverId, requestId]);

  if (loading) return <PageLoader />;
  if (loadError) return <Alert>{loadError}</Alert>;
  return <BookingForm caregiver={data.caregiver} careRequest={data.careRequest} onDone={() => navigate('/patient/bookings', { state: { booked: true } })} onBack={() => navigate(-1)} />;
}

function BookingForm({ caregiver, careRequest, onDone, onBack }) {
  // Prefill from the care request when we came from Smart Match / an application.
  const hours = careRequest?.hours_per_day ?? 8;
  const [form, setForm] = useState({
    care_type: RECIPIENT_TO_CARE_TYPE[careRequest?.care_recipient] ?? 'daycare',
    start_day: careRequest?.start_date ?? '',
    start_time: '08:00',
    end_day: careRequest?.start_date ?? '',
    end_time: addHours('08:00', hours),
    address: careRequest?.address ?? '',
    special_needs: careRequest?.special_needs ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const startISO = form.start_day && nairobiISO(form.start_day, form.start_time);
  const endISO = form.end_day && nairobiISO(form.end_day, form.end_time);
  const estimate = useMemo(() => estimateAmount(startISO, endISO, caregiver.hourly_rate), [startISO, endISO, caregiver.hourly_rate]);
  const multiDay = form.start_day && form.end_day && form.end_day !== form.start_day;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.start_day || !form.end_day) return setError('Choose start and end dates.');
    if (new Date(endISO) <= new Date(startISO)) return setError('The visit must end after it starts.');
    if (new Date(startISO) < new Date()) return setError('The start time is in the past.');
    if (form.address.trim().length < 5) return setError('Add the address where care will happen.');
    setSubmitting(true);
    try {
      await bookingApi.create({
        caregiver_id: caregiver.id,
        care_type: form.care_type,
        start_date: startISO,
        end_date: endISO,
        address: form.address.trim(),
        special_needs: form.special_needs,
        latitude: careRequest?.latitude ?? null,
        longitude: careRequest?.longitude ?? null,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Request a booking</h1>
      <p className="mt-1 text-gray-500">The caregiver will confirm before anything is charged.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Type of care">
              <select className="input" value={form.care_type} onChange={set('care_type')}>
                {BOOKING_CARE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <div className="flex gap-2">
                  <input type="date" className="input" min={todayISODate()} value={form.start_day}
                    onChange={(e) => setForm((f) => ({ ...f, start_day: e.target.value, end_day: f.end_day && f.end_day >= e.target.value ? f.end_day : e.target.value }))} />
                  <input type="time" className="input w-32" value={form.start_time} onChange={set('start_time')} />
                </div>
              </Field>
              <Field label="Ends">
                <div className="flex gap-2">
                  <input type="date" className="input" min={form.start_day || todayISODate()} value={form.end_day} onChange={set('end_day')} />
                  <input type="time" className="input w-32" value={form.end_time} onChange={set('end_time')} />
                </div>
              </Field>
            </div>
            <Field label="Address">
              <input className="input" value={form.address} onChange={set('address')} placeholder="Estate, house number, nearest landmark" />
            </Field>
            <Field label="Notes for the caregiver">
              <textarea className="input min-h-[90px]" value={form.special_needs} onChange={set('special_needs')}
                placeholder="Medication times, mobility, dietary needs…" />
            </Field>
            <Alert>{error}</Alert>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              <CalendarCheck className="h-5 w-5" /> Send booking request
            </Button>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={caregiver.user.full_name} src={caregiver.user.avatar} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate font-bold">{caregiver.user.full_name} <VerifiedBadge verified={caregiver.user.is_verified} compact /></div>
                <Rating value={caregiver.rating_avg} count={caregiver.rating_count} />
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Rate</dt><dd className="font-semibold">{kes(caregiver.hourly_rate)}/hr</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Duration</dt><dd className="font-semibold">{estimate.hours ? `${estimate.hours.toFixed(1)} hrs` : '—'}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                <dt className="font-bold">Estimated total</dt><dd className="font-extrabold text-brand-700">{kes(estimate.amount)}</dd>
              </div>
            </dl>
          </Card>
          {multiDay && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <Info className="h-4 w-4 shrink-0" />
              Multi-day bookings are billed for the full time between start and end. For daily visits, book each day separately or choose live-in care.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
