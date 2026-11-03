import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function AnnouncementBar() {
  return (
    <div className="relative z-40 bg-olive-700 text-cream">
      <div className="shell flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-center text-[0.6875rem] tracking-wide sm:text-xs">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
        <span className="text-cream/80">Your first delivery is on us over $25.</span>
        <Link
          to="/#offers"
          className="inline-flex items-center gap-1 font-medium text-gold-200 underline-offset-4 transition hover:text-cream hover:underline"
        >
          Use code HELLO25
          <ArrowRight aria-hidden="true" className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
