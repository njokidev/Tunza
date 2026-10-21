import { useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { careRequestApi, caregiverApi, unwrap } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { kmBetween } from '../../lib/format';
import { Alert, EmptyState, PageHeader, PageLoader } from '../../components/ui';
import JobCard from './JobCard';
import ApplyModal from './ApplyModal';

const APPLIED_KEY = 'tunza.applied';
const loadApplied = () => { try { return new Set(JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]')); } catch { return new Set(); } };

export function useAppliedJobs() {
  const [applied, setApplied] = useState(loadApplied);
  const markApplied = (id) => setApplied((prev) => {
    const next = new Set(prev).add(id);
    try { localStorage.setItem(APPLIED_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
    return next;
  });
  return { applied, markApplied };
}

export function withDistance(requests, profile) {
  return requests
    .map((r) => ({ r, d: kmBetween(profile?.latitude, profile?.longitude, r.latitude, r.longitude) }))
    .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
}

export default function OpenJobs() {
  const { applied, markApplied } = useAppliedJobs();
  const [applying, setApplying] = useState(null);
  const [notice, setNotice] = useState('');

  const { data, loading, error } = useAsync(async () => {
    const [reqs, me] = await Promise.all([careRequestApi.open(), caregiverApi.me()]);
    return { requests: unwrap(reqs.data), profile: me.data };
  }, []);

  const jobs = useMemo(() => withDistance(data?.requests ?? [], data?.profile), [data]);

  return (
    <div>
      <PageHeader title="Open jobs" subtitle="Families who posted an open request. Closest first." />
      <div className="mb-4 space-y-3">
        {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Alert>{error}</Alert>
        {data && !data.profile?.latitude && (
          <Alert kind="info">Set your area on your profile to see how far each job is.</Alert>
        )}
      </div>
      {loading ? <PageLoader /> : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No open requests right now">
          When families post open requests, they'll show up here. Keep your profile complete so Smart Match recommends you too.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map(({ r, d }) => (
            <JobCard key={r.id} request={r} distance={d} applied={applied.has(r.id)} onApply={setApplying} />
          ))}
        </div>
      )}
      <ApplyModal
        request={applying}
        defaultRate={data?.profile?.hourly_rate}
        onClose={() => setApplying(null)}
        onApplied={(id) => { markApplied(id); setApplying(null); setNotice('Application sent. The family will be notified.'); }}
      />
    </div>
  );
}
