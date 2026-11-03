import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LifeBuoy } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROUTES } from '@/config/routes';

/**
 * Deliberately honest 404. Some marketplace routes (cart, checkout, dashboard,
 * restaurant listing) are owned by other team members and are not mounted in
 * this build — this page avoids dead ends and explains the situation.
 */
export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <div className="shell flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-5 text-terracotta-600">404 · Off the menu</p>
      <h1 className="max-w-2xl text-display-lg">
        This page is not at the table <em className="italic text-terracotta">yet.</em>
      </h1>
      <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-olive-500">
        If you followed a link for cart, checkout, restaurant discovery or the restaurant dashboard, that part of the
        experience is being built by another developer on the team.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to={ROUTES.home} iconLeft={<ArrowLeft className="h-4 w-4" />}>
          Back to the marketplace
        </ButtonLink>
        <ButtonLink
          to={ROUTES.orderTracking('ord_10482')}
          variant="outline"
          iconLeft={<Compass className="h-4 w-4" />}
        >
          See a demo delivery
        </ButtonLink>
      </div>

      <div className="mt-10 flex items-center gap-2 text-xs text-olive-500">
        <LifeBuoy aria-hidden="true" className="h-3.5 w-3.5" />
        Need a hand?{' '}
        <Link to="/#support" className="font-medium text-olive-600 underline-offset-4 hover:underline">
          Contact support
        </Link>
      </div>
    </div>
  );
}
