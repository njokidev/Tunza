import { useState } from 'react';
import { Award, BadgeCheck, Clock, ExternalLink, FileText, IdCard, MapPin, Phone, ShieldCheck, ShieldOff, ShieldX, Star, UserX, RotateCcw } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { fmtDate, kes } from '../../lib/format';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, PageLoader, Tabs } from '../../components/ui';
import { Pager, SearchBox, useDebounced } from './shared';

const TABS = [
  { value: 'pending', label: 'Waiting' },
  { value: 'verified', label: 'Verified' },
  { value: 'suspended', label: 'Suspended' },
];

// What the admin confirms before a caregiver goes live (see the user flow doc).
const CHECKS = [
  'The ID number matches the name, and I have seen the ID',
  'The certificate or Good Conduct document is genuine and current',
  'I have spoken to the caregiver on the phone number shown',
];

const STATUS_BADGE = {
  not_submitted: { label: 'No documents yet', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
  pending: { label: 'Documents submitted', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  rejected: { label: 'Sent back', cls: 'bg-red-50 text-red-700 ring-red-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const ACTIONS = {
  verify: { title: 'Approve caregiver', button: 'Approve', variant: 'success', done: 'is now verified and visible to families.' },
  reject: { title: 'Send back to caregiver', button: 'Send back', variant: 'danger', done: 'was asked to fix their documents.' },
  verify_nurse: { title: 'Verify nursing certificate', button: 'Verify nurse', variant: 'success', done: 'can now take medication administration jobs.' },
  unverify_nurse: { title: 'Remove nursing verification', button: 'Remove', variant: 'danger', done: 'can no longer take medication administration jobs.' },
  unverify: { title: 'Remove verification', button: 'Remove verification', variant: 'danger', done: 'is hidden from families until verified again.' },
  suspend: { title: 'Suspend account', button: 'Suspend', variant: 'danger', done: 'is suspended and can no longer sign in.' },
  reactivate: { title: 'Reactivate account', button: 'Reactivate', variant: 'primary', done: 'can sign in again.' },
};

export default function AdminVerification() {
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const [flash, setFlash] = useState('');
  const { data, loading, error, reload } = useAsync(
    async () => (await adminApi.caregivers({ status: tab, search, page })).data,
    [tab, search, page]
  );
  const [act, setAct] = useState(null); // {caregiver, action}

  const list = data?.results ?? [];
  return (
    <div>
      <PageHeader title="Verification" subtitle="Check each caregiver's documents before families can find and book them." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={TABS.map((t) => ({ ...t, count: t.value === tab ? data?.count : 0 }))} value={tab}
          onChange={(v) => { setTab(v); setPage(1); }} />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email, phone, area" />
      </div>
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Alert kind="success" onClose={() => setFlash('')}>{flash}</Alert>
        {loading && !data ? <PageLoader /> : list.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={tab === 'pending' ? 'No one is waiting' : 'No caregivers here'}>
            {tab === 'pending' ? 'New caregiver sign-ups will appear here for review.' : 'Try a different search.'}
          </EmptyState>
        ) : list.map((c) => (
          <CaregiverCard key={c.id} c={c} tab={tab} onAction={(action) => setAct({ caregiver: c, action })} />
        ))}
        <Pager page={page} count={data?.count} onPage={setPage} />
      </div>

      {act && (
        <ActionModal
          {...act}
          onClose={() => setAct(null)}
          onDone={(msg) => { setAct(null); setFlash(msg); reload({ silent: true }); }}
        />
      )}
    </div>
  );
}

function CaregiverCard({ c, tab, onAction }) {
  const u = c.user;
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 gap-4">
          <Avatar name={u.full_name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{u.full_name}</h2>
              {u.is_verified
                ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><BadgeCheck className="h-3.5 w-3.5" />Verified</Badge>
                : STATUS_BADGE[c.verification_status] && <Badge className={STATUS_BADGE[c.verification_status].cls}>{STATUS_BADGE[c.verification_status].label}</Badge>}
              {c.nurse_verified && <Badge className="bg-brand-50 text-brand-700 ring-brand-200"><Award className="h-3.5 w-3.5" />Verified nurse</Badge>}
              {!u.is_active && <Badge className="bg-red-50 text-red-700 ring-red-200">Suspended</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>{u.email}</span>
              {u.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{u.phone}</span>}
              {(c.work_areas?.length || c.location_name) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.work_areas?.length ? c.work_areas.join(', ') : c.location_name}</span>}
              <span>Joined {fmtDate(u.date_joined)}</span>
            </div>
            {c.bio && <p className="mt-3 max-w-prose text-sm text-gray-700">{c.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.specializations.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <Item label="Experience" value={`${c.years_exp} yrs · ${c.experience}`} />
              <Item label="Rate" value={`${kes(c.hourly_rate)}/h`} />
              <Item label="Bookings" value={`${c.bookings_completed} done of ${c.bookings_total}`} />
              <Item label="Rating" value={c.rating_count ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(c.rating_avg).toFixed(1)} ({c.rating_count})</span> : 'No reviews'} />
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-72">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-sm">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-gray-500">
              Documents
              {c.verification_submitted_at && <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal"><Clock className="h-3 w-3" />{fmtDate(c.verification_submitted_at)}</span>}
            </div>
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-gray-400" />
              {c.id_number ? <span className="font-mono">{c.id_number}</span> : <span className="text-amber-700">No ID number given</span>}
            </div>
            {c.documents?.length ? c.documents.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                className="mt-1.5 flex items-center gap-2 font-semibold text-brand-700 hover:underline">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{d.label}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )) : c.certificate ? (
              <a href={c.certificate} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-2 font-semibold text-brand-700 hover:underline">
                <FileText className="h-4 w-4 text-gray-400" />Open certificate
              </a>
            ) : <div className="mt-1.5 flex items-center gap-2 text-amber-700"><FileText className="h-4 w-4 text-gray-400" />No documents uploaded yet</div>}
            {c.documents?.length ? <p className="mt-2 text-xs text-gray-500">Links expire after 15 minutes. Refresh the page for new ones.</p> : null}
            {c.verification_status === 'rejected' && c.verification_note && (
              <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">Sent back: {c.verification_note}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === 'pending' && <Button variant="success" size="sm" disabled={c.verification_status !== 'pending'} onClick={() => onAction('verify')}><ShieldCheck className="h-4 w-4" />Approve</Button>}
            {tab === 'pending' && c.verification_status === 'pending' && <Button variant="outline" size="sm" onClick={() => onAction('reject')}><ShieldX className="h-4 w-4" />Send back</Button>}
            {tab !== 'suspended' && (c.documents ?? []).some((d) => d.doc_type === 'nursing' || d.doc_type === 'cna') && (
              c.nurse_verified
                ? <Button variant="ghost" size="sm" onClick={() => onAction('unverify_nurse')}><Award className="h-4 w-4" />Remove nurse</Button>
                : <Button variant="outline" size="sm" onClick={() => onAction('verify_nurse')}><Award className="h-4 w-4" />Verify nurse</Button>
            )}
            {tab === 'verified' && <Button variant="outline" size="sm" onClick={() => onAction('unverify')}><ShieldOff className="h-4 w-4" />Remove verification</Button>}
            {tab !== 'suspended'
              ? <Button variant="danger-soft" size="sm" onClick={() => onAction('suspend')}><UserX className="h-4 w-4" />Suspend</Button>
              : <Button variant="primary" size="sm" onClick={() => onAction('reactivate')}><RotateCcw className="h-4 w-4" />Reactivate</Button>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function ActionModal({ caregiver, action, onClose, onDone }) {
  const cfg = ACTIONS[action];
  const [checks, setChecks] = useState(CHECKS.map(() => false));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const needsChecks = action === 'verify';
  const needsReason = action === 'suspend' || action === 'unverify' || action === 'reject';
  const ready = (!needsChecks || checks.every(Boolean)) && (!needsReason || reason.trim().length >= 5);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await adminApi.userAction(caregiver.user.id, action, reason.trim());
      onDone(`${caregiver.user.full_name} ${cfg.done}`);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${cfg.title}: ${caregiver.user.full_name}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={cfg.variant} loading={busy} disabled={!ready} onClick={submit}>{cfg.button}</Button>
      </>}>
      <div className="space-y-4">
        <Alert>{err}</Alert>
        {needsChecks && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm text-gray-600">Confirm each check before approving.</legend>
            {CHECKS.map((label, i) => (
              <label key={label} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 text-sm text-gray-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={checks[i]}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        {needsReason && (
          <Field label="Reason" hint="Sent to the caregiver with the notification.">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
          </Field>
        )}
        {action === 'verify_nurse' && <p className="text-sm text-gray-600">Open the nursing or CNA certificate and confirm it is genuine and current (you can check the registration number with the Nursing Council of Kenya). This unlocks medication administration jobs.</p>}
        {action === 'reject' && <p className="text-sm text-gray-600">Tell the caregiver exactly what to fix, e.g. "The ID photo is blurry" or "Good Conduct certificate has expired". They can upload again straight away.</p>}
        {action === 'reactivate' && <p className="text-sm text-gray-600">They will be able to sign in again. Their verification status stays as it was.</p>}
      </div>
    </Modal>
  );
}
