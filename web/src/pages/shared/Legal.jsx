import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

/*
 * Terms of Service and Privacy Policy shown at sign-up (linked from both apps).
 * PILOT TEXT: a plain-language starting point written around how Tunza actually
 * works. Have a Kenyan lawyer review it before public launch, and bump
 * TERMS_VERSION on the backend whenever it changes (each user's accepted
 * version is stored).
 * Set VITE_SUPPORT_EMAIL to show a contact address.
 */
const UPDATED = 'October 2026';
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const contact = SUPPORT_EMAIL ? `email ${SUPPORT_EMAIL}` : 'contact us through the Tunza app';

const TERMS = [
  ['What Tunza is', 'Tunza is a marketplace that connects families who need homecare with independent caregivers in Kenya. Tunza is not a healthcare provider and does not employ caregivers. Caregivers decide which jobs to accept and are responsible for the care they give.'],
  ['Your account', 'You must give accurate details, including a phone number you control, and keep your password private. You must be 18 or older to create an account. One person, one account.'],
  ['Caregivers', 'Caregivers must upload genuine documents (national ID, Certificate of Good Conduct and CNA certificate) and agree to a background check. Only caregivers whose nursing or CNA certificate Tunza has checked may take medication administration jobs. Tunza may suspend accounts that give false information or receive serious complaints.'],
  ['Bookings', 'A booking is an agreement between the family and the caregiver. Caregivers have 30 minutes to accept a request, after which it is cancelled automatically. The family\'s full address and both phone numbers are shared only once a booking is confirmed. Caregivers check in and out with their phone\'s location at the start and end of each visit.'],
  ['Payments', 'Families pay the price shown for a booking. Tunza keeps a 12.5% service fee and pays the rest to the caregiver by M-Pesa. Earnings are held for 24 hours after a visit so either side can raise a problem, then become available for payout.'],
  ['Ratings', 'Families rate caregivers and caregivers rate families after a visit. Ratings must be honest and must not contain abuse or private information.'],
  ['Safety', 'In a medical emergency call 999 or 112 first. Report any safety concern to Tunza straight away; we may share information with the police where the law requires it.'],
  ['Liability', 'Tunza works to verify caregivers but cannot guarantee the outcome of any visit. To the extent the law allows, Tunza is not liable for loss caused by a caregiver or a family, but nothing here limits rights you have under Kenyan consumer law.'],
  ['Changes', 'We may update these terms. If we make an important change we will ask you to accept the new version in the app.'],
];

const PRIVACY = [
  ['Who we are', `Tunza processes your personal data under Kenya's Data Protection Act, 2019. For any privacy question or request, ${contact}.`],
  ['What we collect', 'Your name, email, phone number and password (stored encrypted); for families, your home area and address and the people you book care for, including their age group and care needs; for caregivers, your ID number, Certificate of Good Conduct, certificates, languages, rates and work areas; bookings, messages and ratings; your phone\'s location when a caregiver checks in or out or shares live location during a visit.'],
  ['Sensitive data', 'Care needs can reveal health information, and ID and Good Conduct documents are sensitive. We collect them only to match care safely, keep them private, and limit who at Tunza can see them. Verification documents are stored privately and only Tunza\'s verification team can open them.'],
  ['Why we use it', 'To run your account and bookings, match families with suitable caregivers, verify caregivers, process payments and payouts, keep people safe, prevent fraud, and meet legal obligations.'],
  ['Who we share it with', 'The other side of a confirmed booking (name, phone and, for caregivers, the care address); service providers who run parts of Tunza for us — hosting (Render), private document storage (Cloudinary), SMS (Africa\'s Talking) and M-Pesa (Safaricom); and authorities where the law requires it. We do not sell your data.'],
  ['How long we keep it', 'While your account is open, and afterwards only as long as needed for payments, disputes or the law. Verification documents are deleted when replaced or when a caregiver account is closed, unless we must keep them for a legal reason.'],
  ['Your rights', 'You can ask to see, correct or delete your data, object to how we use it, or withdraw consent. You can also complain to the Office of the Data Protection Commissioner (ODPC).'],
  ['Security', 'We use encrypted connections, hashed passwords, one-time SMS codes, and private storage for documents. No system is perfect; tell us at once if you think your account has been misused.'],
];

export default function Legal({ kind }) {
  const isTerms = kind === 'terms';
  const sections = isTerms ? TERMS : PRIVACY;
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link to="/"><Logo /></Link>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-gray-900">{isTerms ? 'Terms of Service' : 'Privacy Policy'}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated {UPDATED}</p>
        <div className="mt-8 space-y-6">
          {sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-lg font-bold text-gray-900">{h}</h2>
              <p className="mt-1 leading-relaxed text-gray-700">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-gray-500">
          See also our <Link to={isTerms ? '/privacy' : '/terms'} className="font-semibold text-brand-700 underline">{isTerms ? 'Privacy Policy' : 'Terms of Service'}</Link>.
        </p>
      </div>
    </div>
  );
}
