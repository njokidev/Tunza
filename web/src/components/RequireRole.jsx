import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { PageLoader } from './ui';
import { needsPhoneVerification } from '../pages/auth/VerifyPhone';

/** Gate a route tree on being signed in, optionally with one of `roles`. */
export default function RequireRole({ roles }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <PageLoader label="Opening Tunza…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  // Phone OTP first, then the family's first-run setup.
  if (needsPhoneVerification(user)) return <Navigate to="/verify-phone" replace />;
  if (user.role === 'patient' && user.needs_onboarding) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}
