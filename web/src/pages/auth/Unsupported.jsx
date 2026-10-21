import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../../components/ui';

export default function Unsupported() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-brand-700" />
        <h1 className="mt-4 text-xl font-bold">Admin accounts use Django admin</h1>
        <p className="mt-2 text-sm text-gray-500">
          {user ? `${user.full_name}, the` : 'The'} web app is for families and caregivers. Manage verification and
          users at <a className="font-semibold text-brand-700" href="http://127.0.0.1:8000/admin/">127.0.0.1:8000/admin</a>.
        </p>
        <Button className="mt-6" onClick={logout}>Log out</Button>
      </Card>
    </div>
  );
}
