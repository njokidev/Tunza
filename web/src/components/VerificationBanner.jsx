import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Check, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fmtDate, fmtDay } from '../lib/format';

/**
 * Caregiver dashboard, while Tunza checks their documents (mobile:
 * components/VerificationBanner.js). They can use the app and set up their profile,
 * but families can't see or book them yet. Re-checks every minute so it disappears by
 * itself once an admin approves.
 */
export default function VerificationBanner() {
  const { user, refreshUser } = useAuth();
  const setup = user?.caregiver_setup;
  const waiting = user?.role === 'caregiver' && setup && !setup.verified;

  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshUser().catch(() => {}); }, 60000);
    return () => clearInterval(t);
  }, [waiting, refreshUser]);
  if (!waiting) return null;

  const expected = setup.verification_expected_by ? new Date(setup.verification_expected_by) : null;
  const overdue = expected && expected < new Date();
  const steps = [
    { icon: Check, state: 'done', title: 'Documents received', sub: setup.verification_submitted_at ? fmtDate(setup.verification_submitted_at) : '' },
    { icon: Search, state: 'active', title: 'Background check', sub: 'ID and Certificate of Good Conduct' },
    { icon: Briefcase, state: 'next', title: 'Families can book you', sub: 'As soon as you are approved' },
  ];

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex flex-1 items-start gap-3">
          <div className="rounded-xl bg-brand-700 p-2.5 text-white"><Clock className="h-5 w-5" /></div>
          <div>
            <div className="font-bold text-gray-900">We're checking your documents</div>
            <div className="text-sm font-semibold text-brand-800">
              {overdue ? 'Taking a little longer than usual. We are on it.'
                : expected ? `Expect an answer by ${fmtDay(expected)}` : 'Expect an answer in 2–3 days'}
            </div>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              Until then you're hidden from families and can't apply for jobs. Look around, and make your profile great so you're ready on day one. We'll text you when you're approved.
            </p>
            <Link to="/caregiver/profile" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
              Polish your profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <ol className="flex gap-4 md:w-80">
          {steps.map(({ icon: Icon, state, title, sub }) => (
            <li key={title} className="flex flex-1 flex-col items-center text-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${state === 'done' ? 'bg-emerald-600 text-white' : state === 'active' ? 'bg-brand-700 text-white' : 'bg-white text-gray-400'}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className={`mt-1.5 text-xs font-bold ${state === 'next' ? 'text-gray-500' : 'text-gray-900'}`}>{title}</span>
              <span className="text-[11px] text-gray-500">{sub}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
