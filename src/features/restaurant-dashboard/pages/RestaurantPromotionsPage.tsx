import { useState } from 'react';
import {
  BarChart3,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  TicketPercent,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { ConfirmDialog } from '@/features/dashboard/components/ConfirmDialog';
import { DashboardPageHeader } from '@/features/dashboard/components/DashboardPageHeader';
import { DashboardPanel } from '@/features/dashboard/components/DashboardPanel';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { CouponFormDialog } from '@/features/dashboard/coupons/CouponFormDialog';
import { CouponStatusBadge } from '@/features/dashboard/coupons/CouponStatusBadge';
import { CouponUsageDialog } from '@/features/dashboard/coupons/CouponUsageDialog';
import {
  formatPromotionLimit,
  formatPromotionValue,
} from '@/features/dashboard/coupons/coupon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/services/api/errors';
import { useToast } from '@/stores/toast-store';
import type { Promotion, PromotionInput } from '@/types';
import { useRestaurantProfile } from '../hooks/useRestaurantDashboard';
import {
  useCreateRestaurantPromotion,
  useDeleteRestaurantPromotion,
  usePromotionPolicy,
  useRestaurantPromotions,
  useSetRestaurantPromotionStatus,
  useUpdateRestaurantPromotion,
} from '../hooks/useRestaurantPromotions';

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; coupon: Promotion }
  | null;

export default function RestaurantPromotionsPage() {
  useDocumentTitle('Coupons');

  const profile = useRestaurantProfile();
  const coupons = useRestaurantPromotions();
  const policy = usePromotionPolicy();
  const create = useCreateRestaurantPromotion();
  const update = useUpdateRestaurantPromotion();
  const setStatusMutation = useSetRestaurantPromotionStatus();
  const removeCoupon = useDeleteRestaurantPromotion();
  const notify = useToast();

  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [usageTarget, setUsageTarget] = useState<Promotion | null>(null);

  const rows = coupons.data ?? [];
  const activeCount = rows.filter(
    (coupon) => coupon.status === 'ACTIVE',
  ).length;
  const redemptions = rows.reduce(
    (sum, coupon) => sum + (coupon.redemptionCount ?? coupon.usageCount ?? 0),
    0,
  );
  const totalGranted = rows.reduce(
    (sum, coupon) => sum + (coupon.discountGranted ?? 0),
    0,
  );

  const toggle = (coupon: Promotion) => {
    const active = !(coupon.active ?? coupon.status === 'ACTIVE');
    setStatusMutation.mutate(
      { promotionId: coupon.id, active },
      {
        onSuccess: () =>
          notify({
            tone: 'success',
            title: active ? 'Coupon activated' : 'Coupon deactivated',
            description: `${coupon.code} is now ${active ? 'available' : 'unavailable'} at checkout.`,
          }),
        onError: (error) =>
          notify({
            tone: 'error',
            title: 'Could not update the coupon',
            description: getErrorMessage(error),
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Offers & coupons"
        title="Your coupons"
        description="Create discounts for your restaurant, set conditions within the platform limits, and track how each code performs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void coupons.refetch()}
              isLoading={coupons.isFetching}
              iconLeft={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setEditor({ mode: 'create' })}
              iconLeft={<Plus aria-hidden="true" className="h-3.5 w-3.5" />}
            >
              Create coupon
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Coupons"
          value={String(rows.length)}
          icon={<TicketPercent aria-hidden="true" className="h-4 w-4" />}
        />
        <StatCard label="Active now" value={String(activeCount)} />
        <StatCard label="Redemptions" value={String(redemptions)} />
        <StatCard
          label="Discount given"
          value={formatCurrency(totalGranted)}
          icon={<BarChart3 aria-hidden="true" className="h-4 w-4" />}
        />
      </div>

      {coupons.isLoading ? (
        <PageLoader label="Loading your coupons…" />
      ) : coupons.isError ? (
        <ErrorState
          title="Coupons could not be loaded"
          description={getErrorMessage(coupons.error)}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void coupons.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<TicketPercent className="h-6 w-6" />}
          title="No coupons yet"
          description="Offer a first-order discount, free delivery or a limited-time percentage off to bring customers in."
          action={
            <Button type="button" size="sm" onClick={() => setEditor({ mode: 'create' })}>
              Create coupon
            </Button>
          }
        />
      ) : (
        <DashboardPanel bodyClassName="px-0 py-0">
          <div className="divide-y divide-olive-900/8">
            {rows.map((coupon) => (
              <div
                key={coupon.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-wide text-olive-900">
                      {coupon.code}
                    </p>
                    <CouponStatusBadge status={coupon.status} />
                    {coupon.firstOrderOnly ? (
                      <Badge tone="gold">First order</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-olive-600">
                    {coupon.title}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-olive-500">
                    {formatPromotionValue(coupon)}
                    {coupon.minOrder
                      ? ` · min ${formatCurrency(coupon.minOrder)}`
                      : ''}
                    {coupon.maxDiscount
                      ? ` · capped at ${formatCurrency(coupon.maxDiscount)}`
                      : ''}
                    {' · '}
                    ends {new Date(coupon.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[0.75rem] sm:grid-cols-3 lg:w-[22rem]">
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Usage
                    </p>
                    <p className="text-olive-800">
                      {formatPromotionLimit(coupon)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Per customer
                    </p>
                    <p className="text-olive-800">
                      {coupon.perCustomerLimit ?? 1}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Discount given
                    </p>
                    <p className="text-olive-800">
                      {formatCurrency(coupon.discountGranted ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUsageTarget(coupon)}
                    iconLeft={<BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />}
                  >
                    Usage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditor({ mode: 'edit', coupon })}
                    iconLeft={<Pencil aria-hidden="true" className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(coupon)}
                    disabled={
                      setStatusMutation.isPending || coupon.status === 'EXPIRED'
                    }
                    iconLeft={
                      coupon.active ? (
                        <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <Power aria-hidden="true" className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {coupon.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(coupon)}
                    disabled={(coupon.usageCount ?? 0) > 0}
                    title={
                      (coupon.usageCount ?? 0) > 0
                        ? 'Coupons with redemptions can only be deactivated.'
                        : 'Delete coupon'
                    }
                    iconLeft={<Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
                    className="text-terracotta-600 hover:bg-terracotta-50 disabled:text-olive-400"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      )}

      {editor ? (
        <CouponFormDialog
          mode={editor.mode}
          coupon={editor.mode === 'edit' ? editor.coupon : undefined}
          allowGlobal={false}
          restaurantName={profile.data?.name}
          policy={policy.data}
          isSaving={create.isPending || update.isPending}
          onClose={() => setEditor(null)}
          onSave={(input: PromotionInput) => {
            const done = () => {
              setEditor(null);
              notify({
                tone: 'success',
                title:
                  editor.mode === 'create'
                    ? 'Coupon created'
                    : 'Coupon updated',
              });
            };
            const fail = (error: unknown) =>
              notify({
                tone: 'error',
                title: 'Could not save the coupon',
                description: getErrorMessage(error),
              });

            if (editor.mode === 'create') {
              create.mutate(input, { onSuccess: done, onError: fail });
            } else {
              update.mutate(
                { promotionId: editor.coupon.id, input },
                { onSuccess: done, onError: fail },
              );
            }
          }}
        />
      ) : null}

      <CouponUsageDialog
        open={Boolean(usageTarget)}
        promotion={usageTarget}
        scope="owner"
        onClose={() => setUsageTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.code ?? 'this coupon'}?`}
        description="Unused coupons can be deleted permanently. Coupons with redemptions must be deactivated instead so order history stays intact."
        confirmLabel="Delete coupon"
        tone="danger"
        isLoading={removeCoupon.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeCoupon.mutate(deleteTarget.id, {
            onSuccess: () => {
              notify({ tone: 'success', title: 'Coupon deleted' });
              setDeleteTarget(null);
            },
            onError: (error) =>
              notify({
                tone: 'error',
                title: 'Could not delete the coupon',
                description: getErrorMessage(error),
              }),
          });
        }}
      />
    </div>
  );
}
