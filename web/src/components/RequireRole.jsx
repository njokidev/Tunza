import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { PageLoader } from './ui';

/** Gate a route tree on being signed in, optionally with one of `roles`. */
export default function RequireRole({ roles }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <PageLoader label="Opening Tunza…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
