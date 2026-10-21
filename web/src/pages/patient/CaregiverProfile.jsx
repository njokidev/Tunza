import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CalendarDays, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { caregiverApi, messageApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { DAYS_LONG, EXPERIENCE_LEVELS } from '../../lib/constants';
import { fmtShortTime, kes } from '../../lib/format';
import { Alert, Avatar, Button, ButtonLink, Card, PageLoader, Rating, VerifiedBadge } from '../../components/ui';

export function useStartChat() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [chatError, setChatError] = useState('');
  const startChat = async (userId) => {
    setStarting(true);
    setChatError('');
    try {
      const { data } = await messageApi.start(userId);
      navigate(`/messages/${data.id}`);
    } catch (e) {
      setChatError(errorMessage(e));
      setStarting(false);
    }
  };
  return { startChat, starting, chatError };
}

export default function CaregiverProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startChat, starting, chatError } = useStartChat();
  const { data: cg, loading, error } = useAsync(async () => (await caregiverApi.get(id)).data, [id]);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const level = EXPERIENCE_LEVELS.find((e) => e.value === cg.experience)?.label;
  const availability = cg.availability ?? [];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={cg.user.full_name} src={cg.user.avatar} size="xl" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight">{cg.user.full_name}</h1>
                  <VerifiedBadge verified={cg.user.is_verified} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {cg.location_name && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{cg.location_name}</span>}
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{cg.years_exp} years · {level}</span>
                </div>
                <div className="mt-2"><Rating value={cg.rating_avg} count={cg.rating_count} /></div>
              </div>
            </div>

            {cg.specializations?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {cg.specializations.map((s) => (
                  <span key={s.id} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{s.name}</span>
                ))}
              </div>
            )}

            <div className="mt-6">
              <h2 className="font-bold">About</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">{cg.bio || `${cg.user.full_name.split(' ')[0]} hasn't written a bio yet.`}</p>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-brand-700" /> Weekly availability</h2>
            {availability.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No fixed schedule listed — message to confirm availability.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {availability.map((a) => (
                  <li key={a.id} className="flex justify-between py-2.5 text-sm">
                    <span className="font-medium">{DAYS_LONG[a.day]}</span>
                    <span className="text-gray-600">{fmtShortTime(a.start_time)} – {fmtShortTime(a.end_time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <div className="text-3xl font-extrabold text-brand-700">{kes(cg.hourly_rate)}</div>
            <div className="text-sm text-gray-500">per hour</div>
            <div className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cg.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {cg.is_available ? 'Taking new clients' : 'Not taking new clients'}
            </div>
            <ButtonLink to={`/patient/book/${cg.id}`} state={{ caregiver: cg }} size="lg" className="mt-6 w-full">
              Request booking
            </ButtonLink>
            <Button variant="outline" size="lg" className="mt-3 w-full" loading={starting} onClick={() => startChat(cg.user.id)}>
              <MessageCircle className="h-4 w-4" /> Message
            </Button>
            <div className="mt-3"><Alert>{chatError}</Alert></div>
            <div className="mt-6 flex gap-3 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-700" />
              You only pay for completed visits. Tunza holds your booking details securely.
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
