import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, MapPin } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { BOOKING_STATUS } from '../../lib/constants';
import { careTypeLabel, caregiverNet, fmtDate, fmtDay, fmtTime, kes, platformFee, timeAgo } from '../../lib/format';
import { Alert, Badge, Button, EmptyState, Field, Modal, PageHeader, PageLoader, StatusBadge } from '../../components/ui';
import { Pager, SearchBox, Select, Table, useDebounced } from './shared';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' },
  ...Object.entries(BOOKING_STATUS).map(([value, s]) => ({ value, label: s.label }))];

export default function AdminBookings() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [q, setQ] = useState('');
  const [paid, setPaid] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, loading, error, reload } = useAsync(
    async () => (await adminApi.bookings({ status: status || undefined, paid: paid || undefined, search, page })).data,
    [status, paid, search, page]
  );
  const [open, setOpen] = useState(null);
  const [flash, setFlash] = useState('');
  const list = data?.results ?? [];

  const setStatus = (v) => { setPage(1); setParams(v ? { status: v } : {}); };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Every booking on Tunza. Open one to see details or step in." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search family, caregiver or address" />
        <Select label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <Select label="Payment" value={paid} onChange={(v) => { setPaid(v); setPage(1); }} options={[
          { value: '', label: 'Paid and unpaid' }, { value: 'true', label: 'Paid' }, { value: 'false', label: 'Unpaid' },
        ]} />
      </div>
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Alert kind="success" onClose={() => setFlash('')}>{flash}</Alert>
        {loading && !data ? <PageLoader /> : list.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No bookings match">Try another status or search.</EmptyState>
        ) : (
          <Table head={['Requested', 'Family', 'Caregiver', 'Care', 'Visit', 'Amount', 'Status']}>
            {list.map((b) => (
              <tr key={b.id} onClick={() => setOpen(b)} className="cursor-pointer hover:bg-brand-50/40"
                tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(b)}>
                <td className="px-4 py-3 text-gray-500">{timeAgo(b.created_at)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{b.patient?.full_name}</td>
                <td className="px-4 py-3">{b.caregiver?.user?.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{careTypeLabel(b.care_type)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtDay(b.start_date)}, {fmtTime(b.start_date)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {kes(b.total_amount)}
                  {b.is_paid && <span className="ml-1.5 text-xs font-semibold text-emerald-700">Paid</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge map={BOOKING_STATUS} status={b.status} /></td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} count={data?.count} onPage={setPage} />
      </div>
      {open && (
        <BookingModal booking={open} onClose={() => setOpen(null)}
          onDone={(msg) => { setOpen(null); setFlash(msg); reload({ silent: true }); }} />
      )}
    </div>
  );
}

function BookingModal({ booking: b, onClose, onDone }) {
  const [next, setNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const options = (b.allowed_actions ?? []).map((s) => ({ value: s, label: BOOKING_STATUS[s]?.label ?? s }));

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const notes = note.trim() ? `${b.notes ? `${b.notes}\n` : ''}Admin: ${note.trim()}` : undefined;
      await adminApi.setBookingStatus(b.id, next, notes);
      onDone(`Booking moved to ${BOOKING_STATUS[next]?.label ?? next}. Both sides were notified.`);
    } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Booking details"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button loading={busy} disabled={!next} onClick={submit}>Change status</Button>
      </>}>
      <div className="space-y-5 text-sm">
        <div className="flex items-center gap-2">
          <StatusBadge map={BOOKING_STATUS} status={b.status} />
          {b.is_paid ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Paid</Badge> : <Badge>Unpaid</Badge>}
          <span className="ml-auto text-xs text-gray-400">Requested {fmtDate(b.created_at)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Family" value={<>{b.patient?.full_name}<div className="text-xs font-normal text-gray-500">{b.patient?.phone || b.patient?.email}</div></>} />
          <Row label="Caregiver" value={<>{b.caregiver?.user?.full_name}<div className="text-xs font-normal text-gray-500">{b.caregiver?.user?.phone || b.caregiver?.user?.email}</div></>} />
          <Row label="Care" value={careTypeLabel(b.care_type)} />
          <Row label="Visit" value={`${fmtDay(b.start_date)} ${fmtTime(b.start_date)} – ${fmtDay(b.end_date)} ${fmtTime(b.end_date)}`} />
          <Row label="Total" value={kes(b.total_amount)} />
          <Row label="Split" value={`${kes(caregiverNet(b.total_amount))} caregiver · ${kes(platformFee(b.total_amount))} Tunza`} />
        </dl>
        <div className="flex items-start gap-2 text-gray-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{b.address}</div>
        {b.special_needs && <div><div className="text-xs font-semibold text-gray-500">Care needs</div><p className="whitespace-pre-line text-gray-700">{b.special_needs}</p></div>}
        {b.notes && <div><div className="text-xs font-semibold text-gray-500">Notes</div><p className="whitespace-pre-line text-gray-700">{b.notes}</p></div>}

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="mb-3 font-semibold text-gray-900">Step in</div>
          <Alert>{err}</Alert>
          <div className="grid gap-3">
            <Field label="New status">
              <select value={next} onChange={(e) => setNext(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                <option value="">Choose a status</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            {next === 'completed' && !b.is_paid && (
              <p className="text-xs text-amber-700">Completing a visit marks it paid and adds it to the caregiver's payout. No M-Pesa payment is taken yet.</p>
            )}
            <Field label="Note (optional)" hint="Saved on the booking.">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
