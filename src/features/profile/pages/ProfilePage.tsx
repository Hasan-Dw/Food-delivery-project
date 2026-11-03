import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  FlaskConical,
  Leaf,
  LogOut,
  MapPin,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { PersonalInfoForm } from '@/features/profile/components/PersonalInfoForm';
import { AddressBook } from '@/features/profile/components/AddressBook';
import { PreferencesPanel } from '@/features/profile/components/PreferencesPanel';
import { PaymentMethodsPanel } from '@/features/profile/components/PaymentMethodsPanel';
import { useProfileData } from '@/features/profile/hooks/useProfileData';
import { useToast } from '@/stores/toast-store';
import { formatMemberSince } from '@/lib/format';
import { scrollToSection } from '@/lib/scroll';
import { ROUTES } from '@/config/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';

const profileSections = [
  { id: 'details', label: 'Personal details', icon: UserRound },
  { id: 'addresses', label: 'Delivery addresses', icon: MapPin },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'payments', label: 'Payment methods', icon: CreditCard },
] as const;

const dietaryLabels: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'gluten-free': 'Gluten-free',
  halal: 'Halal',
};

export default function ProfilePage() {
  useDocumentTitle('Your profile');
  const { user, signOut } = useAuth();
  const { profile, addresses, paymentMethods } = useProfileData();
  const notify = useToast();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('details');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const ids = profileSections.map((section) => section.id);

    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 180) current = id;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) {
        current = ids[ids.length - 1];
      }

      setActiveSection(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const person = profile.data ?? user;

  if (!person) {
    return <PageLoader label="Opening your account…" />;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      notify({ tone: 'info', title: 'Signed out', description: 'Your demo session has ended on this device.' });
      navigate(ROUTES.home, { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-olive-900/8 bg-cream">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-32 h-[24rem] w-[24rem] rounded-full border border-olive-900/6"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-gold-100/50 blur-3xl"
        />

        <div className="shell relative py-10 lg:py-14">
          <p className="eyebrow text-terracotta-600">Your Savora account</p>

          <div className="mt-5 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                name={person.fullName}
                imageKey={person.avatarKey}
                size="xl"
                ring
                className="ring-offset-cream"
              />
              <div>
                <h1 className="text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.02]">{person.fullName}</h1>
                <p className="mt-2 text-[0.875rem] text-olive-500">
                  {person.email} · Member since {formatMemberSince(person.memberSince)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="gold" icon={<FlaskConical className="h-3 w-3" />}>
                    Demo account
                  </Badge>
                  {person.preferences.dietary.map((preference) => (
                    <Badge key={preference} tone="outline" icon={<Leaf className="h-3 w-3" />}>
                      {dietaryLabels[preference] ?? preference}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <ButtonLink
                to={ROUTES.orderTracking('ord_10482')}
                variant="outline"
                size="sm"
                iconLeft={<MapPin aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Track a demo order
              </ButtonLink>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                isLoading={signingOut}
                iconLeft={<LogOut aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                Sign out
              </Button>
            </div>
          </div>

          {profile.isError ? (
            <div className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[0.8125rem] text-danger">
              <p>
                We could not refresh your profile from the demo service. Your signed-in details are shown instead.
              </p>
              <button
                type="button"
                onClick={() => profile.refetch()}
                className="mt-1.5 font-medium underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="shell grid gap-8 py-10 lg:grid-cols-[15rem_1fr] lg:gap-14 lg:py-14">
        <ProfileNav
          activeSection={activeSection}
          className="min-w-0 self-start lg:sticky lg:top-28"
        />

        <div className="min-w-0 space-y-7">
          <PersonalInfoForm user={person} />

          <AddressBook
            addresses={addresses.data ?? []}
            isLoading={addresses.isLoading}
            isError={addresses.isError}
            onRetry={() => addresses.refetch()}
          />

          <PreferencesPanel user={person} />

          <PaymentMethodsPanel
            methods={paymentMethods.data ?? []}
            isLoading={paymentMethods.isLoading}
            isError={paymentMethods.isError}
            onRetry={() => paymentMethods.refetch()}
          />

          <section className="rounded-panel border border-gold-300/50 bg-gold-50/60 p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-200/70 text-gold-700">
                <FlaskConical aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[1.2rem] text-olive-900">This is a demo account</h2>
                <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-olive-600">
                  Your session is stored in this browser and is not encrypted or verified by a server. Changes persist
                  for this tab only. Authentication, payments and live delivery data are deliberately simulated; no
                  real orders or charges are created.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={handleSignOut} isLoading={signingOut}>
                    Sign out of demo
                  </Button>
                  <a
                    href={`mailto:hello@savora.co`}
                    className="text-[0.75rem] font-medium text-olive-600 underline-offset-4 hover:underline"
                  >
                    Ask the team a question
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ProfileNav({
  activeSection,
  className,
}: {
  activeSection: string;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <p className="hidden text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-olive-500 lg:block">
        On this page
      </p>

      <nav
        aria-label="Profile sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar lg:mx-0 lg:mt-4 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {profileSections.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2.5 text-left text-[0.8125rem] font-medium transition lg:w-full',
                active
                  ? 'bg-olive-700 text-cream shadow-soft'
                  : 'bg-cream text-olive-600 ring-1 ring-inset ring-olive-900/8 hover:text-olive-900 lg:bg-transparent lg:ring-0 lg:hover:bg-olive-900/5',
              )}
            >
              <Icon aria-hidden="true" className={cn('h-4 w-4', active ? 'text-gold-200' : 'text-olive-500')} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-7 hidden rounded-2xl border border-olive-900/10 bg-cream p-4 lg:block">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-terracotta-600">Need a hand?</p>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-olive-500">
          Our support team is around every day, 8am–11pm.
        </p>
        <a
          href="mailto:hello@savora.co"
          className="mt-3 inline-flex text-[0.75rem] font-medium text-olive-700 underline-offset-4 hover:underline"
        >
          hello@savora.co
        </a>
      </div>
    </div>
  );
}
