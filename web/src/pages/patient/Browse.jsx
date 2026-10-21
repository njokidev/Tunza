import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Users } from 'lucide-react';
import { caregiverApi, unwrap } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { Alert, ButtonLink, EmptyState, PageHeader, PageLoader } from '../../components/ui';
import CaregiverCard from '../../components/CaregiverCard';

const SORTS = [
  { value: '-rating_avg', label: 'Top rated' },
  { value: 'hourly_rate', label: 'Lowest rate' },
  { value: '-hourly_rate', label: 'Highest rate' },
  { value: '-years_exp', label: 'Most experienced' },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('search') ?? '');

  // Debounce typing into the URL so refresh/back keep the filters.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('search', q); else next.delete('search');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = {
    search: params.get('search') || undefined,
    specializations: params.get('specializations') || undefined,
    max_rate: params.get('max_rate') || undefined,
    ordering: params.get('ordering') || '-rating_avg',
    is_available: params.get('available') === '0' ? undefined : 'true',
  };

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data: specs } = useAsync(async () => unwrap((await caregiverApi.specializations()).data), []);
  const { data, loading, error } = useAsync(
    async () => (await caregiverApi.list(filters)).data,
    [JSON.stringify(filters)]
  );
  const caregivers = unwrap(data);

  return (
    <div>
      <PageHeader title="Browse caregivers" subtitle="Verified caregivers near you. Filter, compare and book directly." />

      <div className="mb-6 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search by name, area or specialty…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input md:w-48" value={params.get('specializations') ?? ''} onChange={(e) => setFilter('specializations', e.target.value)}>
          <option value="">All specialties</option>
          {(specs ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input md:w-40" value={params.get('max_rate') ?? ''} onChange={(e) => setFilter('max_rate', e.target.value)}>
          <option value="">Any rate</option>
          <option value="500">Up to KES 500/hr</option>
          <option value="800">Up to KES 800/hr</option>
          <option value="1200">Up to KES 1,200/hr</option>
        </select>
        <select className="input md:w-44" value={filters.ordering} onChange={(e) => setFilter('ordering', e.target.value)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <Alert>{error}</Alert>

      {loading ? <PageLoader /> : caregivers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No caregivers found"
          action={<ButtonLink to="/patient/care-needs?path=open_request" variant="outline"><SlidersHorizontal className="h-4 w-4" /> Post an open request</ButtonLink>}
        >
          Try clearing filters — or post an open request and let caregivers come to you.
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">{data?.count ?? caregivers.length} caregiver{(data?.count ?? caregivers.length) === 1 ? '' : 's'}</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {caregivers.map((cg) => (
              <CaregiverCard
                key={cg.id}
                cg={cg}
                to={`/patient/caregivers/${cg.id}`}
                actions={<>
                  <ButtonLink to={`/patient/caregivers/${cg.id}`} variant="outline" size="sm">Profile</ButtonLink>
                  <ButtonLink to={`/patient/book/${cg.id}`} state={{ caregiver: cg }} size="sm">Book</ButtonLink>
                </>}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
