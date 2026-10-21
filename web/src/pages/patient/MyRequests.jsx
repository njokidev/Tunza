import { Link } from 'react-router-dom';
import { ClipboardList, MapPin, Megaphone, Plus, Sparkles } from 'lucide-react';
import { careRequestApi, unwrap } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { REQUEST_STATUS } from '../../lib/constants';
import { fmtDate, kes, recipientLabel, timeAgo } from '../../lib/format';
import { Alert, ButtonLink, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from '../../components/ui';

export default function MyRequests() {
  const { data, loading, error } = useAsync(async () => unwrap((await careRequestApi.mine()).data), []);

  return (
    <div>
      <PageHeader
        title="My care requests"
        subtitle="Every care need you've posted, with its matches or applications."
        action={<ButtonLink to="/patient/care-needs?path=smart_match"><Plus className="h-4 w-4" /> New request</ButtonLink>}
      />
      <Alert>{error}</Alert>
      {loading ? <PageLoader /> : !data?.length ? (
        <EmptyState icon={ClipboardList} title="No care requests yet"
          action={<ButtonLink to="/patient/care-needs?path=smart_match"><Sparkles className="h-4 w-4" /> Start Smart Match</ButtonLink>}>
          Describe who needs care and when — we'll find caregivers who fit.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((r) => {
            const open = r.discovery_path === 'open_request';
            const to = open ? `/patient/requests/${r.id}/applications` : `/patient/requests/${r.id}/matches`;
            return (
              <Link key={r.id} to={to} state={{ careRequest: r }}>
                <Card className="h-full p-5 transition hover:border-brand-200 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700">
                      {open ? <Megaphone className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {open ? 'Open request' : 'Smart Match'}
                    </div>
                    <StatusBadge map={REQUEST_STATUS} status={r.status} />
                  </div>
                  <h3 className="mt-2 font-bold text-gray-900">{recipientLabel(r.care_recipient)}</h3>
                  <p className="text-sm text-gray-600">{(r.care_types || []).join(', ')}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>From {fmtDate(r.start_date)}{r.end_date && ` to ${fmtDate(r.end_date)}`}</span>
                    <span>{r.hours_per_day} hrs/day</span>
                    {Number(r.budget_max) > 0 && <span>{kes(r.budget_min)}–{kes(r.budget_max)}/hr</span>}
                    {r.location_name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location_name}</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-xs text-gray-400">Posted {timeAgo(r.created_at)}</span>
                    <span className="font-semibold text-brand-700">{open ? 'View applications →' : 'View matches →'}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
