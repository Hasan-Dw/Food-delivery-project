import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Star, Timer } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Image } from '@/components/ui/Image';
import { site } from '@/config/site';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';

interface AuthPanel {
  imageKey: string;
  quote: string;
  attribution: string;
  eyebrow: string;
}

const panels: Record<string, AuthPanel> = {
  [ROUTES.login]: {
    imageKey: 'auth-kitchen',
    eyebrow: 'Welcome back',
    quote: 'The best part of dinner is the part where someone else cooks it.',
    attribution: 'Maya B. · Savora customer since 2023',
  },
  [ROUTES.register]: {
    imageKey: 'auth-table',
    eyebrow: 'Join the table',
    quote: 'One account, every kitchen worth knowing in your neighbourhood.',
    attribution: '48,000 diners across 12 cities',
  },
  [ROUTES.forgotPassword]: {
    imageKey: 'auth-dessert',
    eyebrow: 'We have all been there',
    quote: 'A good meal and a fresh start. Both are easier than you think.',
    attribution: 'Savora customer care',
  },
};

/**
 * Auth shell. Marketing lives on the right, the task stays on the left.
 * On mobile the imagery steps aside so forms load fast and stay focused.
 */
export function AuthLayout() {
  const { pathname } = useLocation();
  const panel = panels[pathname] ?? panels[ROUTES.login];

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[1fr_1.02fr]">
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          <Link to={ROUTES.home} aria-label="Savora home">
            <Logo />
          </Link>
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-olive-500 transition hover:text-olive-900"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to marketplace
          </Link>
        </header>

        <main className="flex flex-1 items-center py-10 sm:py-14">
          <div className={cn('mx-auto w-full', pathname === ROUTES.register ? 'max-w-[36rem]' : 'max-w-[27rem]')}>
            <Outlet />
          </div>
        </main>

        <footer className="flex flex-col gap-3 border-t border-olive-900/10 pt-5 text-[0.6875rem] text-olive-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Savora. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <FlaskConical aria-hidden="true" className="h-3.5 w-3.5 text-olive-300" />
              Demo environment · simulated sign-in
            </span>
            <a href={`mailto:${site.email}`} className="transition hover:text-olive-700">
              Need help?
            </a>
          </div>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-olive-800 lg:block">
        <Image
          imageKey={panel.imageKey}
          priority
          sizes="50vw"
          className="absolute inset-0 h-full w-full"
          imageClassName="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-olive-900/90 via-olive-900/35 to-olive-900/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ivory/10 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/25 bg-olive-900/25 px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream backdrop-blur-md">
              <Star aria-hidden="true" className="h-3.5 w-3.5 fill-gold-300 text-gold-300" />
              4.9 average · 12k reviews
            </span>
          </div>

          <div className="max-w-lg">
            <p className="eyebrow mb-5 text-gold-200">{panel.eyebrow}</p>
            <blockquote className="font-display text-[clamp(2.2rem,3.2vw,3.4rem)] leading-[1.04] text-cream">
              “{panel.quote}”
            </blockquote>
            <p className="mt-6 text-[0.8125rem] text-cream/60">{panel.attribution}</p>

            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-cream/15 pt-6">
              <MiniStat icon={<Timer className="h-4 w-4" />} value="28 min" label="Average delivery" />
              <MiniStat icon={<Star className="h-4 w-4" />} value="240+" label="Independent kitchens" />
              <MiniStat icon={<FlaskConical className="h-4 w-4" />} value="Preview" label="Browser-only sign-in" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div>
      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-cream/20 text-gold-200">
        {icon}
      </span>
      <p className="text-sm font-medium text-cream">{value}</p>
      <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-cream/45">{label}</p>
    </div>
  );
}
