import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '../../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <EmptyState icon={Compass} title="Page not found" action={<ButtonLink to="/">Go home</ButtonLink>}>
        The page you were looking for doesn't exist or has moved.
      </EmptyState>
    </div>
  );
}
