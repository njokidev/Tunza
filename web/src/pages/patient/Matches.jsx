import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Search, Sparkles } from 'lucide-react';
import { careRequestApi, unwrap } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { recipientLabel, fmtDate } from '../../lib/format';
import { Alert, Button, ButtonLink, EmptyState, PageHeader, PageLoader } from '../../components/ui';
import CaregiverCard from '../../components/CaregiverCard';

export default function Matches() {
  const { id } = useParams();
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.justCreated ? 'Your care needs were saved. Here are your best-fit caregivers.' : '');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(null);

  const { data, setData, loading, error } = useAsync(async () => {
    const [matchesRes, mineRes] = await Promise.all([
      careRequestApi.matches(id),
      location.state?.careRequest ? Promise.resolve(null) : careRequestApi.mine(),
    ]);
    const careRequest = location.state?.careRequest ?? unwrap(mineRes?.data).find((r) => r.id === id) ?? null;
    return { matches: unwrap(matchesRes.data), careRequest };
  }, [id]);

  const shortlist = async (m) => {
    setBusy(m.id);
    setActionError('');
    try {
      await careRequestApi.shortlist(id, m.id);
      setData((d) => ({ ...d, matches: d.matches.map((x) => (x.id === m.id ? { ...x, status: 'shortlisted' } : x)) }));
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageLoader label="Ranking caregivers for you…" />;

  const cr = data?.careRequest;
  const matches = data?.matches ?? [];

  return (
    <div>
      <PageHeader
        back={<Link to="/patient/requests" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> My requests</Link>}
        title={<span className="inline-flex items-center gap-2"><Sparkles className="h-7 w-7 text-brand-700" /> Your matches</span>}
        subtitle={cr
          ? `${recipientLabel(cr.care_recipient)} · ${(cr.care_types || []).join(', ')} · from ${fmtDate(cr.start_date)}${cr.location_name ? ` · ${cr.location_name}` : ''}`
          : 'Ranked by specialty, availability, distance, experience, verification, rating and price.'}
        action={<ButtonLink to="/patient/browse" variant="outline"><Search className="h-4 w-4" /> Browse all</ButtonLink>}
      />

      <div className="space-y-3">
        {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Alert>{error}</Alert>
        <Alert>{actionError}</Alert>
      </div>

      {!error && matches.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No strong matches yet"
          action={<div className="flex flex-wrap justify-center gap-2">
            <ButtonLink to="/patient/browse">Browse caregivers</ButtonLink>
            <ButtonLink to="/patient/care-needs?path=open_request" variant="outline">Post an open request</ButtonLink>
          </div>}
        >
          Only verified, available caregivers are ranked. Try browsing, or post an open request so caregivers can apply to you.
        </EmptyState>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {matches.map((m, i) => {
          const to = `/patient/caregivers/${m.caregiver.id}`;
          const shortlisted = m.status === 'shortlisted';
          return (
            <CaregiverCard
              key={m.id}
              cg={m.caregiver}
              match={m}
              rank={i + 1}
              to={to}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shortlist(m)}
                    loading={busy === m.id}
                    disabled={shortlisted || m.status === 'booked'}
                    title="Let them know you're interested"
                  >
                    {shortlisted ? <BookmarkCheck className="h-4 w-4 text-brand-700" /> : <Bookmark className="h-4 w-4" />}
                    {shortlisted ? 'Shortlisted' : 'Shortlist'}
                  </Button>
                  <ButtonLink
                    size="sm"
                    to={`/patient/book/${m.caregiver.id}?request=${id}`}
                    state={{ caregiver: m.caregiver, careRequest: cr }}
                  >
                    Request booking
                  </ButtonLink>
                </>
              }
            />
          );
        })}
      </div>

      {matches.length > 0 && (
        <p className="mt-8 text-center text-xs text-gray-400">
          Match score weights: specialty 30% · availability 25% · location 15% · experience 10% · verification 10% · rating 5% · price 5%
        </p>
      )}
    </div>
  );
}
