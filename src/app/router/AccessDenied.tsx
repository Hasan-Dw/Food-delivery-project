import type { ReactNode } from 'react';
import { Ban, Clock3, ShieldX, XCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { StatePanel } from '@/components/ui/StatePanel';
import { ROUTES } from '@/config/routes';

type AccessTone = 'forbidden' | 'pending' | 'rejected' | 'suspended';

const toneIcons: Record<AccessTone, ReactNode> = {
  forbidden: <ShieldX className="h-6 w-6" />,
  pending: <Clock3 className="h-6 w-6" />,
  rejected: <XCircle className="h-6 w-6" />,
  suspended: <Ban className="h-6 w-6" />,
};

/**
 * Shared access notice for role and approval guards. It is intentionally
 * generic so every dashboard owner gets the same consistent boundary.
 */
export function AccessDenied({
  tone = 'forbidden',
  title,
  description,
  action,
}: {
  tone?: AccessTone;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const isError = tone === 'forbidden' || tone === 'rejected' || tone === 'suspended';

  return (
    <div className="shell py-16">
      <StatePanel
        tone={isError ? 'error' : 'default'}
        icon={toneIcons[tone]}
        title={title}
        description={description}
        action={
          action ?? (
            <ButtonLink to={ROUTES.home} variant="outline" size="sm">
              Back to the marketplace
            </ButtonLink>
          )
        }
      />
    </div>
  );
}
