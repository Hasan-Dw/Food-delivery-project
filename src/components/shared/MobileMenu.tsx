import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, LogOut, MapPin, Search, X } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { primaryNav } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { roleLabels, roleLandingPath } from '@/lib/permissions';
import { site } from '@/config/site';
import { useSelectedArea } from '@/stores/location-store';
import { useSearchDialogStore } from '@/stores/search-dialog-store';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { user, signOut } = useAuth();
  const area = useSelectedArea();
  const openSearch = useSearchDialogStore((state) => state.open);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-ink/35 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 right-0 flex w-full max-w-[24rem] animate-slide-in flex-col bg-ivory shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-olive-900/10 px-5 py-4">
          <Link to={ROUTES.home} onClick={onClose} aria-label="Savora home">
            <Logo />
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-olive-900/15 text-olive-700 transition hover:bg-olive-900/5"
            aria-label="Close menu"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <button
            type="button"
            onClick={() => {
              onClose();
              openSearch();
            }}
            className="mb-7 flex w-full items-center gap-3 rounded-xl border border-olive-900/12 bg-cream/70 px-3.5 py-3 text-left text-[0.8125rem] text-olive-600 transition hover:border-olive-900/25 hover:bg-cream hover:text-olive-900"
          >
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-terracotta-600" />
            <span className="min-w-0 flex-1 truncate">Search restaurants, dishes or cuisines</span>
            <kbd className="rounded border border-olive-900/15 bg-ivory px-1.5 py-0.5 text-[0.625rem] text-olive-500">
              ⌘K
            </kbd>
          </button>

          <p className="eyebrow mb-1.5 text-terracotta-600">Deliver to</p>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-olive-900/12 bg-cream/70 px-3.5 py-3 text-olive-700">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-terracotta-600" />
            <span className="text-[0.8125rem] font-medium">{area.city}</span>
          </div>
          <p className="mb-3 text-[0.6875rem] text-olive-500">Savora currently delivers across Latakia only.</p>

          <nav aria-label="Primary" className="mt-8 border-t border-olive-900/10 pt-2">
            {primaryNav.map((item, index) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className="flex items-center justify-between border-b border-olive-900/8 py-3.5 transition-colors hover:text-terracotta-600"
              >
                <span className="font-display text-[1.6rem] leading-none text-olive-800">{item.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-[0.625rem] tabular-nums text-olive-300">0{index + 1}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-olive-300" />
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-7 space-y-2.5">
            {user ? (
              <>
                {user.role !== 'CUSTOMER' ? (
                  <ButtonLinkBlock
                    to={roleLandingPath(user.role)}
                    onNavigate={onClose}
                    variant="primary"
                  >
                    <LayoutDashboard aria-hidden="true" className="mr-2 h-4 w-4" />
                    {roleLabels[user.role]} dashboard
                  </ButtonLinkBlock>
                ) : null}
                <ButtonLinkBlock to={ROUTES.profile} onNavigate={onClose}>
                  Your profile
                </ButtonLinkBlock>
                <ButtonLinkBlock to={ROUTES.orderHistory} onNavigate={onClose}>
                  Your orders
                </ButtonLinkBlock>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    onClose();
                    void signOut();
                  }}
                  iconLeft={<LogOut aria-hidden="true" className="h-4 w-4" />}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <ButtonLinkBlock to={ROUTES.login} onNavigate={onClose} variant="primary">
                  Sign in
                </ButtonLinkBlock>
                <ButtonLinkBlock to={ROUTES.register} onNavigate={onClose} variant="outline">
                  Create an account
                </ButtonLinkBlock>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-olive-900/10 px-5 py-4 text-[0.6875rem] leading-relaxed text-olive-500">
          <p>{site.supportHours}</p>
          <a href={`mailto:${site.email}`} className="text-olive-600 underline-offset-4 hover:underline">
            {site.email}
          </a>
        </div>
      </div>
    </div>
  );
}

function ButtonLinkBlock({
  to,
  children,
  onNavigate,
  variant = 'outline',
}: {
  to: string;
  children: ReactNode;
  onNavigate: () => void;
  variant?: 'primary' | 'outline';
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        'flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition',
        variant === 'primary'
          ? 'bg-terracotta-600 text-cream hover:bg-terracotta-700'
          : 'border border-olive-900/20 text-olive-800 hover:bg-cream',
      )}
    >
      {children}
    </Link>
  );
}
