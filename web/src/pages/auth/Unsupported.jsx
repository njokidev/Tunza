import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../../components/ui';

export default function Unsupported() {
  const { user, logout } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-brand-700" />
        <h1 className="mt-4 text-xl font-bold">This account can't use the web app</h1>
        <p className="mt-2 text-sm text-gray-500">
          {user ? `${user.full_name}, the` : 'The'} web app is for families, caregivers and Tunza admins. Log out and sign in
          with one of those accounts.
        </p>
        <Button className="mt-6" onClick={logout}>Log out</Button>
      </Card>
    </div>
  );
}
