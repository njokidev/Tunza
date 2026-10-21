import { Heart } from 'lucide-react';

export default function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? 'bg-white text-brand-700' : 'bg-brand-700 text-white'}`}>
        <Heart className="h-5 w-5 fill-current" />
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-800'}`}>Tunza</span>
    </span>
  );
}
