import { useQuery } from '@tanstack/react-query';
import { BarChart3, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/format';
import { services } from '@/services';
import { getErrorMessage } from '@/services/api/errors';
import type { Promotion } from '@/types';

export function CouponUsageDialog({
  open,
  promotion,
  scope,
  onClose,
}: {
  open: boolean;
  promotion: Promotion | null;
  scope: 'admin' | 'owner';
  onClose: () => void;
}) {
  const promotionId = promotion?.id ?? '';
  const usage = useQuery({
    queryKey:
      scope === 'admin'
        ? queryKeys.promotionUsage(promotionId)
        : queryKeys.restaurantPromotionUsage(promotionId),
    queryFn: () =>
      scope === 'admin'
        ? services.promotions.getUsage(promotionId)
        : services.promotions.getMyUsage(promotionId),
    enabled: open && Boolean(promotionId),
  });

  if (!open || !promotion) return null;

  const data = usage.data;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-olive-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-usage-title"
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-panel border border-olive-900/10 bg-cream p-6 shadow-lift"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
              Coupon usage
            </p>
            <h2
              id="coupon-usage-title"
              className="mt-1 font-display text-[1.35rem] text-olive-900"
            >
              {promotion.code}
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-olive-500">
              {promotion.title}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1.5 text-olive-500 transition hover:bg-olive-900/10 hover:text-olive-800"
            aria-label="Close usage statistics"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {usage.isLoading ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : usage.isError ? (
          <p className="mt-5 rounded-xl bg-danger/5 px-3.5 py-3 text-[0.75rem] text-danger">
            {getErrorMessage(usage.error)}
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-olive-900/10 bg-ivory/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-olive-500">
                  <Receipt aria-hidden="true" className="h-3 w-3" />
                  Redemptions
                </p>
                <p className="mt-0.5 font-display text-[1.35rem] text-olive-900">
                  {data?.totalRedemptions ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-olive-900/10 bg-ivory/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-olive-500">
                  <BarChart3 aria-hidden="true" className="h-3 w-3" />
                  Discount given
                </p>
                <p className="mt-0.5 font-display text-[1.35rem] text-olive-900">
                  {formatCurrency(data?.totalDiscount ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-olive-900/10 bg-ivory/60 p-3.5">
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-olive-500">
                  Remaining uses
                </p>
                <p className="mt-0.5 font-display text-[1.35rem] text-olive-900">
                  {promotion.usageLimit
                    ? Math.max(
                        0,
                        promotion.usageLimit - (data?.totalRedemptions ?? 0),
                      )
                    : '∞'}
                </p>
              </div>
            </div>

            {data?.lastRedeemedAt ? (
              <p className="mt-3 text-[0.6875rem] text-olive-500">
                Last redeemed {new Date(data.lastRedeemedAt).toLocaleString()}
              </p>
            ) : null}

            <div className="mt-5">
              <h3 className="text-[0.75rem] font-semibold text-olive-800">
                Recent redemptions
              </h3>
              {!data?.recent.length ? (
                <p className="mt-2 rounded-xl border border-dashed border-olive-900/15 px-3.5 py-4 text-[0.75rem] text-olive-500">
                  No orders have redeemed this coupon yet.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-olive-900/8 rounded-xl border border-olive-900/10">
                  {data.recent.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.75rem]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-olive-800">
                          Order {entry.orderId.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-[0.6875rem] text-olive-500">
                          {new Date(entry.redeemedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-olive-800">
                        −{formatCurrency(entry.discount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
