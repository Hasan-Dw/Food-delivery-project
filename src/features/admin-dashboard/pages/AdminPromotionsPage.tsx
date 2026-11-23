import { useDeferredValue, useState } from 'react';
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
import type {
  Promotion,
  PromotionInput,
  PromotionScope,
  PromotionStatus,
} from '@/types';
import { useAdminRestaurants } from '../hooks/useAdminDashboard';
import {
  useAdminPromotions,
  useCreatePromotion,
  useDeletePromotion,
  useSetPromotionStatus,
  useUpdatePromotion,
} from '../hooks/useAdminPromotions';

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; coupon: Promotion }
  | null;

export default function AdminPromotionsPage() {
  useDocumentTitle('Offers & coupons');

  const [scope, setScope] = useState<'' | PromotionScope>('');
  const [status, setStatus] = useState<'' | PromotionStatus>('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const coupons = useAdminPromotions({
    scope: scope || undefined,
    status: status || undefined,
    q: deferredSearch.trim() || undefined,
  });
  const restaurants = useAdminRestaurants();
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const setStatusMutation = useSetPromotionStatus();
  const removeCoupon = useDeletePromotion();
  const notify = useToast();

  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [usageTarget, setUsageTarget] = useState<Promotion | null>(null);

  const rows = coupons.data ?? [];
  const globalCount = rows.filter((coupon) => coupon.scope === 'GLOBAL').length;
  const restaurantCount = rows.length - globalCount;
  const totalGranted = rows.reduce(
    (sum, coupon) => sum + (coupon.discountGranted ?? 0),
    0,
  );
  const hasFilters = Boolean(scope || status || deferredSearch.trim());

  const resetFilters = () => {
    setScope('');
    setStatus('');
    setSearch('');
  };

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
        title="Coupon management"
        description="Create platform-wide campaigns or coupons scoped to a single restaurant, set redemption limits and monitor real usage."
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
          hint={hasFilters ? 'Matching current filters' : 'All campaigns'}
        />
        <StatCard label="Global" value={String(globalCount)} />
        <StatCard label="Restaurant-scoped" value={String(restaurantCount)} />
        <StatCard
          label="Discount granted"
          value={formatCurrency(totalGranted)}
          icon={<BarChart3 aria-hidden="true" className="h-4 w-4" />}
          hint="From recorded redemptions"
        />
      </div>

      <DashboardPanel bodyClassName="px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block lg:w-56">
            <span className="text-[0.75rem] font-medium text-olive-700">
              Search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Code or title"
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
            />
          </label>
          <label className="block lg:w-44">
            <span className="text-[0.75rem] font-medium text-olive-700">
              Scope
            </span>
            <select
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as '' | PromotionScope)
              }
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
            >
              <option value="">All scopes</option>
              <option value="GLOBAL">Global</option>
              <option value="RESTAURANT">Restaurant</option>
            </select>
          </label>
          <label className="block lg:w-44">
            <span className="text-[0.75rem] font-medium text-olive-700">
              Status
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as '' | PromotionStatus)
              }
              className="mt-1 w-full rounded-xl border border-olive-900/15 bg-ivory px-3 py-2 text-[0.8125rem] text-olive-900 outline-none focus:border-olive-500"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </DashboardPanel>

      {coupons.isLoading ? (
        <PageLoader label="Loading coupons…" />
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
          title={hasFilters ? 'No coupons match these filters' : 'No coupons yet'}
          description={
            hasFilters
              ? 'Try a different scope or status, or clear the filters.'
              : 'Create the first campaign to start offering discounts at checkout.'
          }
          action={
            hasFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setEditor({ mode: 'create' })}>
                Create coupon
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-olive-900/10 bg-cream md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-[0.75rem]">
                <thead className="border-b border-olive-900/10 bg-ivory/70 text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Coupon</th>
                    <th className="px-4 py-3 font-semibold">Offer</th>
                    <th className="px-4 py-3 font-semibold">Scope</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Usage</th>
                    <th className="px-4 py-3 font-semibold">Granted</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-900/8">
                  {rows.map((coupon) => (
                    <tr key={coupon.id} className="align-top">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold tracking-wide text-olive-900">
                          {coupon.code}
                        </p>
                        <p className="mt-0.5 max-w-[15rem] truncate text-olive-500">
                          {coupon.title}
                        </p>
                        {coupon.firstOrderOnly ? (
                          <Badge tone="gold" className="mt-1.5">
                            First order
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-olive-700">
                        {formatPromotionValue(coupon)}
                        {coupon.minOrder ? (
                          <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                            Min {formatCurrency(coupon.minOrder)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-olive-700">
                        {coupon.scope === 'GLOBAL' ? (
                          <Badge tone="olive">Global</Badge>
                        ) : (
                          <div>
                            <Badge tone="cream">Restaurant</Badge>
                            <p className="mt-1 max-w-[11rem] truncate text-[0.6875rem] text-olive-500">
                              {coupon.restaurantName ?? coupon.restaurantId}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <CouponStatusBadge status={coupon.status} />
                        <p className="mt-1 text-[0.6875rem] text-olive-500">
                          Ends {new Date(coupon.expiresAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-olive-700">
                        <p>{formatPromotionLimit(coupon)}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-olive-500">
                          {coupon.perCustomerLimit ?? 1} per customer
                        </p>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-olive-700">
                        {formatCurrency(coupon.discountGranted ?? 0)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setUsageTarget(coupon)}
                            iconLeft={
                              <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                            }
                          >
                            Usage
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
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
                              setStatusMutation.isPending ||
                              coupon.status === 'EXPIRED'
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((coupon) => (
              <article
                key={coupon.id}
                className="rounded-2xl border border-olive-900/10 bg-cream p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold tracking-wide text-olive-900">
                      {coupon.code}
                    </p>
                    <p className="truncate text-[0.75rem] text-olive-500">
                      {coupon.title}
                    </p>
                  </div>
                  <CouponStatusBadge status={coupon.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[0.75rem]">
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Offer
                    </p>
                    <p className="text-olive-800">{formatPromotionValue(coupon)}</p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Scope
                    </p>
                    <p className="text-olive-800">
                      {coupon.scope === 'GLOBAL'
                        ? 'Global'
                        : coupon.restaurantName ?? 'Restaurant'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Usage
                    </p>
                    <p className="text-olive-800">{formatPromotionLimit(coupon)}</p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-[0.08em] text-olive-500">
                      Granted
                    </p>
                    <p className="text-olive-800">
                      {formatCurrency(coupon.discountGranted ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1 border-t border-olive-900/8 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUsageTarget(coupon)}
                  >
                    Usage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditor({ mode: 'edit', coupon })}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(coupon)}
                    disabled={setStatusMutation.isPending || coupon.status === 'EXPIRED'}
                  >
                    {coupon.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(coupon)}
                    disabled={(coupon.usageCount ?? 0) > 0}
                    className="text-terracotta-600"
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {editor ? (
        <CouponFormDialog
          mode={editor.mode}
          coupon={editor.mode === 'edit' ? editor.coupon : undefined}
          allowGlobal
          restaurants={(restaurants.data ?? []).map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
          }))}
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
        scope="admin"
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
