import { Link } from 'react-router-dom';
import { MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { Avatar, Card, Rating, VerifiedBadge } from './ui';
import { kes } from '../lib/format';

function MatchRing({ score }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = pct >= 70 ? '#059669' : pct >= 45 ? '#4A0E8F' : '#D97706';
  return (
    <div className="relative h-16 w-16 shrink-0" title={`${pct}% match`}>
      <svg viewBox="0 0 56 56" className="h-16 w-16 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#EEE7F7" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-extrabold text-gray-900">{pct}%</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">match</span>
      </div>
    </div>
  );
}

/**
 * `cg` is a CaregiverProfile from the API. Pass `match` ({match_score, match_reasons})
 * to show the Smart Match ring and the reasons the algorithm ranked them.
 */
export default function CaregiverCard({ cg, match, rank, to, actions }) {
  const specs = cg.specializations ?? [];
  return (
    <Card className="flex flex-col p-5 transition hover:border-brand-200 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <Link to={to} className="relative">
          <Avatar name={cg.user?.full_name} src={cg.user?.avatar} size="lg" />
          {rank && (
            <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white ring-2 ring-white">
              {rank}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={to} className="truncate text-base font-bold text-gray-900 hover:text-brand-700">
              {cg.user?.full_name}
            </Link>
            <VerifiedBadge verified={cg.user?.is_verified} compact />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {cg.location_name && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{cg.location_name}</span>
            )}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{cg.years_exp} yrs exp</span>
          </div>
          <div className="mt-1.5"><Rating value={cg.rating_avg} count={cg.rating_count} /></div>
        </div>
        {match ? <MatchRing score={match.match_score} /> : (
          <div className="text-right">
            <div className="text-lg font-extrabold text-brand-700">{kes(cg.hourly_rate)}</div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
        )}
      </div>

      {specs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {specs.slice(0, 4).map((s) => (
            <span key={s.id} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{s.name}</span>
          ))}
        </div>
      )}

      {match?.match_reasons?.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
          {match.match_reasons.slice(0, 4).map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {r}
            </li>
          ))}
        </ul>
      )}

      {(match || actions) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          {match && <span className="text-sm font-bold text-gray-900">{kes(cg.hourly_rate)}<span className="font-normal text-gray-500">/hr</span></span>}
          {actions && <div className="ml-auto flex gap-2">{actions}</div>}
        </div>
      )}
    </Card>
  );
}
