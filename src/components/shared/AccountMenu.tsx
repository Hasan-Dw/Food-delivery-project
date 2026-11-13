import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useDismissible } from '@/hooks/useDismissible';
import { ROUTES } from '@/config/routes';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

/** Account affordance for the navbar. No auth logic lives here. */
export function AccountMenu() {
  const { user, status, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissible(open, () => setOpen(false), ref);

  if (status === 'loading') {
    return <span className="h-9 w-24 animate-pulse rounded-full bg-olive-900/5" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        to={ROUTES.login}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-olive-900/15 px-4 text-[0.8125rem] font-medium text-olive-800 transition hover:border-olive-900/30 hover:bg-cream"
      >
        <UserRound aria-hidden="true" className="h-4 w-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-olive-900/5"
      >
        <Avatar name={user.fullName} imageKey={user.avatarKey} size="sm" />
        <span className="hidden text-[0.8125rem] font-medium text-olive-800 lg:block">
          {user.fullName.split(' ')[0]}
        </span>
        <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 text-olive-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-60 animate-fade-up overflow-hidden rounded-2xl border border-olive-900/10 bg-cream p-1.5 shadow-lift"
        >
          <div className="border-b border-olive-900/8 px-3 pb-3 pt-2.5">
            <p className="truncate text-sm font-medium text-olive-900">{user.fullName}</p>
            <p className="truncate text-xs text-olive-500">{user.email}</p>
          </div>

          <Link
            to={ROUTES.profile}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.8125rem] text-olive-700 transition hover:bg-olive-900/5"
          >
            <UserRound aria-hidden="true" className="h-4 w-4 text-olive-500" />
            Your profile
          </Link>
          <Link
            to={ROUTES.orderHistory}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.8125rem] text-olive-700 transition hover:bg-olive-900/5"
          >
            <ShoppingBag aria-hidden="true" className="h-4 w-4 text-olive-500" />
            Your orders
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-olive-900/8 px-3 pb-2.5 pt-3 text-left text-[0.8125rem] text-olive-700 transition hover:bg-olive-900/5"
          >
            <LogOut aria-hidden="true" className="h-4 w-4 text-olive-500" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
