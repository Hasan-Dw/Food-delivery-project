import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { PageLoader } from '@/components/ui/Skeleton';
import { roleLabels } from '@/lib/permissions';
import type { AccountStatus, UserRole } from '@/types';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  /** When supplied, only these roles may open the nested route. */
  roles?: readonly UserRole[];
  /** Operational dashboards require an approved owner/driver account. */
  requireApproval?: boolean;
}

const statusCopy: Record<AccountStatus, { title: string; description: string }> = {
  PENDING_APPROVAL: {
    title: 'Your account is awaiting approval',
    description:
      'Savora operations is reviewing your application. You can sign in again once it has been approved.',
  },
  REJECTED: {
    title: 'Your account application was not approved',
    description:
      'This application was rejected. Contact Savora support if you believe the decision was a mistake.',
  },
  SUSPENDED: {
    title: 'This account is suspended',
    description:
      'Access has been suspended by platform operations. Contact Savora support to request a review.',
  },
  APPROVED: {
    title: 'Your account is not ready',
    description: 'This area is not available for your account yet.',
  },
};

/**
 * Protected route boundary. Waits for session hydration, then either renders
 * the nested route or returns the user to sign-in with a safe redirect.
 *
 * Role and approval checks are UX guards, not authorization. The backend must
 * enforce the same rules from the session token on every request.
 */
export function ProtectedRoute({ roles, requireApproval = false }: ProtectedRouteProps) {
  const { status, isAuthenticated, user, hasRole, isApproved, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (roles?.length && !hasRole(roles)) {
    return (
      <AccessDenied
        title="This area is for a different account type"
        description={`You are signed in as ${roleLabels[user.role]}. Ask an administrator if you believe you should have access.`}
      />
    );
  }

  if (requireApproval && !isApproved) {
    const copy = statusCopy[user.accountStatus];
    return (
      <AccessDenied
        tone={user.accountStatus === 'PENDING_APPROVAL' ? 'pending' : user.accountStatus === 'SUSPENDED' ? 'suspended' : 'rejected'}
        title={copy.title}
        description={copy.description}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}
