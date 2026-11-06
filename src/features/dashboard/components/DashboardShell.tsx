import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/config/routes';
import { useToast } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface DashboardShellProps {
  nav: DashboardNavItem[];
  roleLabel: string;
  workspaceLabel: string;
  children: ReactNode;
}

/**
 * Isolated dashboard chrome. It deliberately does not touch the customer
 * marketplace navbar: role workspaces get their own persistent sidebar and
 * top bar while sharing the Savora tokens.
 */
export function DashboardShell({ nav, roleLabel, workspaceLabel, children }: DashboardShellProps) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const notify = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    notify({ tone: 'info', title: 'Signed out', description: 'Your demo workspace session has ended.' });
    navigate(ROUTES.home, { replace: true });
  };

  return (
    <div className="min-h-screen bg-ivory-50 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-olive-900/50 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col bg-olive-900 text-cream transition-transform duration-300 ease-out-soft lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={`${roleLabel} navigation`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-cream/10 px-5 py-5">
          <Link to={ROUTES.home} aria-label="Savora home" className="rounded-full">
            <Logo tone="light" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-full p-2 text-cream/70 transition hover:bg-cream/10 hover:text-cream lg:hidden"
            aria-label="Close navigation"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4 pt-6">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-gold-300/80">
            {workspaceLabel}
          </p>
          <p className="mt-1.5 text-[0.75rem] text-cream/50">{roleLabel} workspace</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.8125rem] font-medium transition',
                  isActive
                    ? 'bg-cream text-olive-900 shadow-soft'
                    : 'text-cream/70 hover:bg-cream/10 hover:text-cream',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0', isActive ? 'text-terracotta-600' : 'text-cream/50')}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cream/10 p-4">
          <Link
            to={ROUTES.home}
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[0.75rem] text-cream/60 transition hover:bg-cream/10 hover:text-cream"
          >
            Customer marketplace
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-cream/10 px-3 py-3">
            <Avatar name={user?.fullName ?? 'Savora'} imageKey={user?.avatarKey} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.75rem] font-medium text-cream">{user?.fullName}</p>
              <p className="truncate text-[0.625rem] text-cream/50">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full p-1.5 text-cream/60 transition hover:bg-cream/10 hover:text-cream"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-olive-900/8 bg-ivory-50/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-olive-900/12 text-olive-700 transition hover:bg-cream lg:hidden"
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-olive-500">
                {roleLabel}
              </p>
              <p className="truncate text-[0.875rem] font-semibold text-olive-900">{workspaceLabel}</p>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-olive-900/10 bg-cream px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-olive-600">
                Demo workspace
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Avatar name={user?.fullName ?? 'Savora'} imageKey={user?.avatarKey} size="sm" />
              <div className="hidden text-right sm:block">
                <p className="max-w-[10rem] truncate text-[0.75rem] font-medium text-olive-900">
                  {user?.fullName}
                </p>
                <p className="max-w-[10rem] truncate text-[0.625rem] text-olive-500">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[82rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
