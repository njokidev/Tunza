import { useState } from 'react';
import { RotateCcw, UserX, Users as UsersIcon } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { fmtDate } from '../../lib/format';
import { Alert, Avatar, Badge, Button, EmptyState, Field, Modal, PageHeader, PageLoader } from '../../components/ui';
import { Pager, SearchBox, Select, Table, useDebounced } from './shared';

const ROLE_LABEL = { patient: 'Family', caregiver: 'Caregiver', admin: 'Admin' };

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const { data, loading, error, reload } = useAsync(
    async () => (await adminApi.users({ search, role: role || undefined, active: active || undefined, page })).data,
    [search, role, active, page]
  );
  const [target, setTarget] = useState(null);
  const [flash, setFlash] = useState('');
  const list = data?.results ?? [];

  return (
    <div>
      <PageHeader title="Users" subtitle="Everyone with a Tunza account." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or phone" />
        <Select label="Role" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={[
          { value: '', label: 'All roles' }, { value: 'patient', label: 'Families' },
          { value: 'caregiver', label: 'Caregivers' }, { value: 'admin', label: 'Admins' },
        ]} />
        <Select label="Account status" value={active} onChange={(v) => { setActive(v); setPage(1); }} options={[
          { value: '', label: 'Active and suspended' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Suspended' },
        ]} />
      </div>
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Alert kind="success" onClose={() => setFlash('')}>{flash}</Alert>
        {loading && !data ? <PageLoader /> : list.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users match">Try another search or filter.</EmptyState>
        ) : (
          <Table head={['Name', 'Role', 'Phone', 'Bookings', 'Joined', 'Status', '']}>
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.full_name} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">{u.full_name}</div>
                      <div className="truncate text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {ROLE_LABEL[u.role]}
                  {u.role === 'caregiver' && !u.is_verified && <span className="ml-1 text-xs text-amber-700">(unverified)</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-600">{u.phone || '—'}</td>
                <td className="px-4 py-3 tabular-nums">{u.bookings}</td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(u.date_joined)}</td>
                <td className="px-4 py-3">
                  {u.is_active
                    ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Active</Badge>
                    : <Badge className="bg-red-50 text-red-700 ring-red-200">Suspended</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== 'admin' && (u.is_active
                    ? <Button size="sm" variant="ghost" onClick={() => setTarget({ user: u, action: 'suspend' })}><UserX className="h-4 w-4" />Suspend</Button>
                    : <Button size="sm" variant="ghost" onClick={() => setTarget({ user: u, action: 'reactivate' })}><RotateCcw className="h-4 w-4" />Reactivate</Button>)}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} count={data?.count} onPage={setPage} />
      </div>
      {target && (
        <SuspendModal {...target} onClose={() => setTarget(null)}
          onDone={(msg) => { setTarget(null); setFlash(msg); reload({ silent: true }); }} />
      )}
    </div>
  );
}

function SuspendModal({ user, action, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const suspending = action === 'suspend';
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await adminApi.userAction(user.id, action, reason.trim());
      onDone(suspending ? `${user.full_name} is suspended and can no longer sign in.` : `${user.full_name} can sign in again.`);
    } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`${suspending ? 'Suspend' : 'Reactivate'} ${user.full_name}?`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={suspending ? 'danger' : 'primary'} loading={busy} disabled={suspending && reason.trim().length < 5} onClick={submit}>
          {suspending ? 'Suspend' : 'Reactivate'}
        </Button>
      </>}>
      <Alert>{err}</Alert>
      {suspending ? (
        <Field label="Reason" hint="Sent to them with the notification. At least 5 characters.">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
        </Field>
      ) : <p className="text-sm text-gray-600">They will be able to sign in and use Tunza again.</p>}
    </Modal>
  );
}
