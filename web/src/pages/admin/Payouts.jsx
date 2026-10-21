import { useState } from 'react';
import { Banknote, CheckCircle2, Copy, Send } from 'lucide-react';
import { adminApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { fmtDate, kes } from '../../lib/format';
import { Alert, Button, Card, EmptyState, Field, Modal, PageHeader, PageLoader } from '../../components/ui';
import { Pager, Table } from './shared';

export default function AdminPayouts() {
  const due = useAsync(async () => unwrap((await adminApi.payoutsDue()).data), []);
  const [page, setPage] = useState(1);
  const history = useAsync(async () => (await adminApi.payouts({ page })).data, [page]);
  const [paying, setPaying] = useState(null);
  const [flash, setFlash] = useState('');

  const dueList = due.data ?? [];
  const totalDue = dueList.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <PageHeader title="Payouts"
        subtitle="Send each caregiver their earnings by M-Pesa, then record the M-Pesa code here." />
      <div className="space-y-6">
        <Alert kind="success" onClose={() => setFlash('')}>{flash}</Alert>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-bold text-gray-900">Due now</h2>
            {dueList.length > 0 && <span className="text-sm text-gray-500">Total to send <b className="tabular-nums text-gray-900">{kes(totalDue)}</b></span>}
          </div>
          <Alert>{due.error}</Alert>
          {due.loading && !due.data ? <PageLoader /> : dueList.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Everyone is paid up">Completed, paid visits appear here until you record a payout.</EmptyState>
          ) : (
            <Table head={['Caregiver', 'M-Pesa number', 'Visits', 'Families paid', 'Tunza 12.5%', 'Send', '']}>
              {dueList.map((r) => (
                <tr key={r.caregiver_id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">{r.phone || <span className="text-amber-700">No phone</span>}</td>
                  <td className="px-4 py-3 tabular-nums">{r.visits}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">{kes(r.gross)}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">{kes(r.commission)}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-gray-900">{kes(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => setPaying(r)} disabled={!r.phone}><Send className="h-4 w-4" />Record payout</Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-bold text-gray-900">History</h2>
          <Alert>{history.error}</Alert>
          {history.loading && !history.data ? <PageLoader /> : (history.data?.results ?? []).length === 0 ? (
            <Card className="p-5 text-sm text-gray-500">No payouts recorded yet.</Card>
          ) : (
            <Table head={['Date', 'Caregiver', 'Visits', 'Sent', 'To', 'M-Pesa code', 'Recorded by']}>
              {history.data.results.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.caregiver_name}</td>
                  <td className="px-4 py-3 tabular-nums">{p.visits}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{kes(p.amount)}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">{p.phone}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.mpesa_reference}</td>
                  <td className="px-4 py-3 text-gray-600">{p.created_by_name || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
          <Pager page={page} count={history.data?.count} onPage={setPage} />
        </section>
      </div>

      {paying && (
        <PayoutModal row={paying} onClose={() => setPaying(null)}
          onDone={(p) => {
            setPaying(null);
            setFlash(`Recorded ${kes(p.amount)} to ${p.caregiver_name} (${p.mpesa_reference}). They have been notified.`);
            due.reload({ silent: true }); history.reload({ silent: true });
          }} />
      )}
    </div>
  );
}

function PayoutModal({ row, onClose, onDone }) {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const code = ref.trim().toUpperCase();
  const valid = /^[A-Z0-9]{6,40}$/.test(code);

  const copy = async () => {
    try { await navigator.clipboard.writeText(row.phone); setCopied(true); } catch { /* clipboard blocked */ }
  };
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await adminApi.recordPayout({ caregiver_id: row.caregiver_id, mpesa_reference: code, note: note.trim() });
      onDone(data);
    } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Pay ${row.name}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={!valid} onClick={submit}><Banknote className="h-4 w-4" />Record payout</Button>
      </>}>
      <div className="space-y-4 text-sm">
        <Alert>{err}</Alert>
        <ol className="space-y-3">
          <li className="rounded-xl border border-gray-100 p-4">
            <div className="text-gray-600">1. Send by M-Pesa</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-gray-900">{kes(row.amount)}</div>
            <div className="mt-1 flex items-center gap-2 text-gray-700">
              to <b className="tabular-nums">{row.phone}</b>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                <Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">{row.visits} visit{row.visits === 1 ? '' : 's'} · families paid {kes(row.gross)} · Tunza keeps {kes(row.commission)}</div>
          </li>
          <li className="rounded-xl border border-gray-100 p-4">
            <div className="mb-2 text-gray-600">2. Enter the M-Pesa confirmation code</div>
            <Field hint="From the M-Pesa SMS, e.g. SJK4XY7Z2P." error={ref && !valid ? 'Letters and numbers only, at least 6.' : ''}>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="SJK4XY7Z2P" autoFocus
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
            </Field>
            <Field label="Note (optional)" className="mt-3">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
          </li>
        </ol>
      </div>
    </Modal>
  );
}
