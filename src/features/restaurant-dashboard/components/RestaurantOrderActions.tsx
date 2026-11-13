import { Check, CookingPot, PackageCheck, X } from 'lucide-react';
import type { Order, OrderAction } from '@/types';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/providers/AuthProvider';
import { actorFromUser, canActOnOrder } from '@/lib/permissions';

interface RestaurantOrderActionsProps {
  order: Order;
  onAction: (action: OrderAction) => void;
  pendingAction?: OrderAction | null;
  size?: 'sm' | 'md';
}

const actionConfig: Partial<
  Record<OrderAction, { label: string; variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold'; icon: typeof Check }>
> = {
  ACCEPT: { label: 'Accept', variant: 'secondary', icon: Check },
  REJECT: { label: 'Reject', variant: 'ghost', icon: X },
  PREPARE: { label: 'Start preparing', variant: 'primary', icon: CookingPot },
  READY: { label: 'Mark ready', variant: 'gold', icon: PackageCheck },
};

export function RestaurantOrderActions({
  order,
  onAction,
  pendingAction,
  size = 'sm',
}: RestaurantOrderActionsProps) {
  const { user } = useAuth();
  const actor = actorFromUser(user);
  if (!actor) return null;

  const candidateActions: OrderAction[] =
    order.status === 'PENDING'
      ? ['ACCEPT', 'REJECT']
      : order.status === 'ACCEPTED'
        ? ['PREPARE']
        : order.status === 'PREPARING'
          ? ['READY']
          : [];

  const actions = candidateActions.filter((action) => canActOnOrder(actor, order, action, order.status));
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const config = actionConfig[action];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <Button
            key={action}
            type="button"
            size={size}
            variant={config.variant}
            isLoading={pendingAction === action}
            disabled={Boolean(pendingAction) && pendingAction !== action}
            onClick={() => onAction(action)}
            iconLeft={<Icon aria-hidden="true" className="h-3.5 w-3.5" />}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
