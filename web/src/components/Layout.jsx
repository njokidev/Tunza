import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home, Search, CalendarCheck, MessageCircle, Wallet, LayoutDashboard,
  Briefcase, UserCog, LogOut, ClipboardList, ShieldCheck, Users, Banknote,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import Logo from './Logo';

const NAV = {
  patient: [
    { to: '/patient', label: 'Home', icon: Home, end: true },
    { to: '/patient/browse', label: 'Browse', icon: Search },
    { to: '/patient/requests', label: 'Requests', icon: ClipboardList },
    { to: '/patient/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/messages', label: 'Messages', icon: MessageCircle },
    { to: '/patient/wallet', label: 'Wallet', icon: Wallet },
  ],
  caregiver: [
    { to: '/caregiver', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/caregiver/jobs', label: 'Open jobs', icon: Briefcase },
    { to: '/caregiver/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/messages', label: 'Messages', icon: MessageCircle },
    { to: '/caregiver/earnings', label: 'Earnings', icon: Wallet },
    { to: '/caregiver/profile', label: 'Profile', icon: UserCog },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/verification', label: 'Verification', icon: ShieldCheck },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/payouts', label: 'Payouts', icon: Banknote },
  ],
};

// Phones get a bottom bar with the five most-used destinations.
const MOBILE_NAV = {
  patient: ['/patient', '/patient/browse', '/patient/bookings', '/messages', '/patient/wallet'],
  caregiver: ['/caregiver', '/caregiver/jobs', '/caregiver/bookings', '/messages', '/caregiver/profile'],
  admin: ['/admin', '/admin/verification', '/admin/bookings', '/admin/users', '/admin/payouts'],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const items = NAV[user.role] ?? [];
  const mobileItems = items.filter((i) => MOBILE_NAV[user.role]?.includes(i.to));

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to={items[0]?.to ?? '/'}><Logo /></Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
              <div className="text-xs capitalize text-gray-500">{user.role}</div>
            </div>
            <Avatar name={user.full_name} src={user.avatar} size="sm" />
            <button onClick={logout} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Log out" aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {mobileItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-700' : 'text-gray-500'}`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
