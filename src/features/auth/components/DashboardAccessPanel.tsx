import { ArrowRight, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { roleLabels, roleLandingPath } from '@/lib/permissions';
import type { UserRole } from '@/types';

type StaffRole = Extract<UserRole, 'ADMIN' | 'RESTAURANT_OWNER' | 'DRIVER'>;

interface DashboardAccessPanelProps {
  role: StaffRole;
  fullName: string;
}

/**
 * Shown immediately after a staff account signs in. The session is already
 * established; this panel only makes the role-specific workspace discoverable
 * without forcing an administrator, owner or driver through the storefront.
 *
 * Route guards and the backend remain the authorization boundary, so a
 * customer can never reach these workspaces by guessing a URL.
 */
export function DashboardAccessPanel({ role, fullName }: DashboardAccessPanelProps) {
  const firstName = fullName.split(' ')[0] || 'there';
  const label = roleLabels[role];

  return (
    <div>
      <p className="eyebrow text-terracotta-600">Signed in</p>
      <h1 className="mt-4 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.03]">
        Welcome back, <em className="italic text-terracotta">{firstName}.</em>
      </h1>
      <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-olive-500">
        Your {label.toLowerCase()} workspace is ready. Open it below, or keep browsing the
        storefront with the same account.
      </p>

      <div className="mt-7 rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-900/5 text-terracotta-600">
            <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-medium text-olive-900">{label} dashboard</p>
            <p className="text-[0.75rem] text-olive-500">
              Signed in as {fullName}
            </p>
          </div>
        </div>

        <ButtonLink
          to={roleLandingPath(role)}
          size="lg"
          fullWidth
          className="mt-5"
        >
          Open {label.toLowerCase()} dashboard
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </ButtonLink>

        <ButtonLink to={ROUTES.home} variant="ghost" fullWidth className="mt-2">
          Continue to the storefront
        </ButtonLink>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl border border-olive-900/10 bg-cream/60 px-3.5 py-3 text-[0.6875rem] leading-relaxed text-olive-500">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-olive-400" />
        Customer-only pages stay hidden from staff accounts. Workspace access is verified by the
        API on every request, not just by this button.
      </p>
    </div>
  );
}
