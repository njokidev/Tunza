import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './context/AuthContext';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import { PageLoader } from './components/ui';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unsupported from './pages/auth/Unsupported';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyPhone from './pages/auth/VerifyPhone';
import Welcome from './pages/patient/Welcome';
import Legal from './pages/shared/Legal';

import PatientHome from './pages/patient/Home';
import CareNeeds from './pages/patient/CareNeeds';
import Matches from './pages/patient/Matches';
import Browse from './pages/patient/Browse';
import CaregiverProfile from './pages/patient/CaregiverProfile';
import RequestBooking from './pages/patient/RequestBooking';
import MyRequests from './pages/patient/MyRequests';
import Applications from './pages/patient/Applications';

import CaregiverDashboard from './pages/caregiver/Dashboard';
import OpenJobs from './pages/caregiver/OpenJobs';
import ProfileEditor from './pages/caregiver/ProfileEditor';
import CaregiverSetup from './pages/caregiver/Setup';

import Bookings from './pages/shared/Bookings';
import Messages from './pages/shared/Messages';
import Wallet from './pages/shared/Wallet';
import NotFound from './pages/shared/NotFound';

import AdminOverview from './pages/admin/Overview';
import AdminVerification from './pages/admin/Verification';
import AdminBookings from './pages/admin/Bookings';
import AdminUsers from './pages/admin/Users';
import AdminPayouts from './pages/admin/Payouts';

function RootRedirect() {
  const { user, booting } = useAuth();
  if (booting) return <PageLoader label="Opening Tunza…" />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unsupported" element={<Unsupported />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-phone" element={<VerifyPhone />} />
      <Route path="/terms" element={<Legal kind="terms" />} />
      <Route path="/privacy" element={<Legal kind="privacy" />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/caregiver/setup" element={<CaregiverSetup />} />

      <Route element={<RequireRole roles={['patient']} />}>
        <Route element={<Layout />}>
          <Route path="/patient" element={<PatientHome />} />
          <Route path="/patient/care-needs" element={<CareNeeds />} />
          <Route path="/patient/requests" element={<MyRequests />} />
          <Route path="/patient/requests/:id/matches" element={<Matches />} />
          <Route path="/patient/requests/:id/applications" element={<Applications />} />
          <Route path="/patient/browse" element={<Browse />} />
          <Route path="/patient/caregivers/:id" element={<CaregiverProfile />} />
          <Route path="/patient/book/:caregiverId" element={<RequestBooking />} />
          <Route path="/patient/bookings" element={<Bookings />} />
          <Route path="/patient/wallet" element={<Wallet />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['caregiver']} />}>
        <Route element={<Layout />}>
          <Route path="/caregiver" element={<CaregiverDashboard />} />
          <Route path="/caregiver/jobs" element={<OpenJobs />} />
          <Route path="/caregiver/bookings" element={<Bookings />} />
          <Route path="/caregiver/profile" element={<ProfileEditor />} />
          <Route path="/caregiver/earnings" element={<Wallet />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['patient', 'caregiver']} />}>
        <Route element={<Layout />}>
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:convId" element={<Messages />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/verification" element={<AdminVerification />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
