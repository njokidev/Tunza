import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Inbox, MessageCircle, X } from 'lucide-react';
import { careRequestApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { kes, recipientLabel, timeAgo } from '../../lib/format';
import { Alert, Badge, Button, ButtonLink, EmptyState, PageHeader, PageLoader } from '../../components/ui';
import CaregiverCard from '../../components/CaregiverCard';
import { useStartChat } from './CaregiverProfile';

const APP_STATUS = {
  applied: 'bg-amber-50 text-amber-700 ring-amber-200',
  shortlisted: 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-gray-100 text-gray-500 ring-gray-200',
};

export default function Applications() {
  const { id } = useParams();
  const location = useLocation();
  const { startChat, chatError } = useStartChat();
  const [notice, setNotice] = useState(location.state?.justCreated
    ? 'Your request is live. Caregivers nearby can now see it and apply — check back here for applications.' : '');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(null);

  const { data, setData, loading, error } = useAsync(async () => {
    const [apps, mine] = await Promise.all([
      careRequestApi.applications(id),
      location.state?.careRequest ? null : careRequestApi.mine(),
    ]);
    const careRequest = location.state?.careRequest ?? unwrap(mine?.data).find((r) => r.id === id) ?? null;
    return { apps: unwrap(apps.data), careRequest };
  }, [id]);

  const decline = async (app) => {
    setBusy(app.id);
    setActionError('');
    try {
      await careRequestApi.rejectApplication(id, app.id);
      setData((d) => ({ ...d, apps: d.apps.map((a) => (a.id === app.id ? { ...a, status: 'rejected' } : a)) }));
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageLoader />;
  const cr = data?.careRequest;
  const apps = data?.apps ?? [];

  return (
    <div>
      <PageHeader
        back={<Link to="/patient/requests" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> My requests</Link>}
        title="Applications"
        subtitle={cr ? `${recipientLabel(cr.care_recipient)} · ${(cr.care_types || []).join(', ')}` : undefined}
      />
      <div className="space-y-3">
        {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Alert>{error}</Alert>
        <Alert>{actionError || chatError}</Alert>
      </div>

      {apps.length === 0 ? (
        <EmptyState icon={Inbox} title="No applications yet">
          Caregivers who apply will appear here with their message and proposed rate.
        </EmptyState>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {apps.map((app) => (
            <div key={app.id} className="space-y-0">
              <CaregiverCard
                cg={app.caregiver}
                to={`/patient/caregivers/${app.caregiver.id}`}
                actions={app.status === 'rejected' ? null : <>
                  <Button variant="ghost" size="sm" onClick={() => decline(app)} loading={busy === app.id}><X className="h-4 w-4" /> Decline</Button>
                  <Button variant="outline" size="sm" onClick={() => startChat(app.caregiver.user.id)}><MessageCircle className="h-4 w-4" /></Button>
                  <ButtonLink size="sm" to={`/patient/book/${app.caregiver.id}?request=${id}`}
                    state={{ caregiver: app.caregiver, careRequest: cr }}>
                    Book
                  </ButtonLink>
                </>}
              />
              <div className="-mt-2 rounded-b-2xl border border-t-0 border-gray-100 bg-gray-50 px-5 pb-4 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <Badge className={APP_STATUS[app.status]}>{app.status}</Badge>
                  <span className="text-xs text-gray-400">{timeAgo(app.created_at)}</span>
                </div>
                {app.proposed_rate && (
                  <p className="mt-2 font-semibold">
                    Proposed: {kes(app.proposed_rate)}/hr
                    {Number(app.proposed_rate) !== Number(app.caregiver.hourly_rate) && (
                      <span className="font-normal text-gray-500"> · bookings bill their profile rate of {kes(app.caregiver.hourly_rate)}/hr</span>
                    )}
                  </p>
                )}
                {app.message && <p className="mt-1 text-gray-600">“{app.message}”</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
