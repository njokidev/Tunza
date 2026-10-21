import { ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import Logo from '../../components/Logo';
import { TAGLINE } from '../../lib/constants';

const POINTS = [
  { icon: ShieldCheck, title: 'Verified caregivers', text: 'ID-checked and reviewed by families like yours.' },
  { icon: Sparkles, title: 'Smart Match', text: 'We rank caregivers by care needs, schedule, distance and budget.' },
  { icon: Wallet, title: 'Pay with confidence', text: 'Transparent rates in KES. Caregivers are paid after each visit.' },
];

export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <Logo light />
        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">{TAGLINE}</h1>
          <p className="mt-4 text-lg text-brand-100">
            Trusted homecare for elderly parents, recovery after surgery, dementia and palliative care — across Nairobi and beyond.
          </p>
          <ul className="mt-10 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <div className="rounded-xl bg-white/10 p-2.5"><Icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-bold">{title}</div>
                  <div className="text-sm text-brand-100">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-auto pt-10 text-xs text-brand-200">Tunza · Kutunza ni upendo.</p>
      </aside>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
            <p className="mt-2 text-sm text-gray-500">{TAGLINE}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
