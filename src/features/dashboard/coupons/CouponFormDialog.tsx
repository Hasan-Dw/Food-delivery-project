import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type {
  Promotion,
  PromotionDiscountType,
  PromotionInput,
  PromotionPolicy,
  PromotionScope,
} from '@/types';
import {
  DISCOUNT_TYPE_LABELS,
  fromDateInputValue,
  toDateInputValue,
} from './coupon';

const OFFER_IMAGE_KEYS = [
  'offer-table-spread',
  'offer-pizza-night',
  'offer-sweet-tooth',
];

const FALLBACK_LIMITS: PromotionPolicy = {
  maxPercentage: 100,
  maxFixedDiscount: 10000,
  maxDiscountCap: 10000,
  maxMinimumOrder: 10000,
  maxTotalUses: 1000000,
  maxUsesPerCustomer: 1000,
};

export interface CouponFormDialogProps {
  mode: 'create' | 'edit';
  coupon?: Promotion;
  /** Admin editors may choose the scope; owner editors are always scoped. */
  allowGlobal: boolean;
  restaurants?: Array<{ id: string; name: string }>;
  restaurantName?: string;
  policy?: PromotionPolicy;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: PromotionInput) => void;
}

export function CouponFormDialog({
  mode,
  coupon,
  allowGlobal,
  restaurants = [],
  restaurantName,
  policy,
  isSaving,
  onClose,
  onSave,
}: CouponFormDialogProps) {
  const limits = policy ?? FALLBACK_LIMITS;
  const codeLocked = (coupon?.usageCount ?? 0) > 0;

  const [code, setCode] = useState(coupon?.code ?? '');
  const [title, setTitle] = useState(coupon?.title ?? '');
  const [subtitle, setSubtitle] = useState(coupon?.subtitle ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [imageKey, setImageKey] = useState(
    coupon?.imageKey ?? OFFER_IMAGE_KEYS[0],
  );
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(
    coupon?.discountType ?? 'PERCENTAGE',
  );
  const [value, setValue] = useState(
    coupon?.discountValue !== undefined && !coupon.freeDelivery
      ? String(coupon.discountValue)
      : '',
  );
  const [minOrder, setMinOrder] = useState(
    coupon?.minOrder !== undefined ? String(coupon.minOrder) : '',
  );
  const [maxDiscount, setMaxDiscount] = useState(
    coupon?.maxDiscount !== undefined ? String(coupon.maxDiscount) : '',
  );
  const [startsAt, setStartsAt] = useState(toDateInputValue(coupon?.startsAt));
  const [expiresAt, setExpiresAt] = useState(
    toDateInputValue(coupon?.expiresAt) ||
      toDateInputValue(new Date(Date.now() + 30 * 86_400_000).toISOString()),
  );
  const [scope, setScope] = useState<PromotionScope>(
    coupon?.scope ?? (allowGlobal ? 'GLOBAL' : 'RESTAURANT'),
  );
  const [restaurantId, setRestaurantId] = useState(
    coupon?.restaurantId ?? restaurants[0]?.id ?? '',
  );
  const [usageLimit, setUsageLimit] = useState(
    String(coupon?.usageLimit ?? 0),
  );
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    String(coupon?.perCustomerLimit ?? 1),
  );
  const [firstOrderOnly, setFirstOrderOnly] = useState(
    coupon?.firstOrderOnly ?? false,
  );
  const [active, setActive] = useState(coupon?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const normalisedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(normalisedCode)) {
      return setError(
        'Use 3–24 letters, numbers, underscores or dashes for the code.',
      );
    }
    if (title.trim().length < 2) return setError('Add a coupon title.');

    const numericValue = value.trim() === '' ? undefined : Number(value);
    if (discountType === 'PERCENTAGE') {
      if (
        numericValue === undefined ||
        !Number.isInteger(numericValue) ||
        numericValue < 1 ||
        numericValue > limits.maxPercentage
      ) {
        return setError(
          `Enter a whole percentage between 1 and ${limits.maxPercentage}.`,
        );
      }
    } else if (discountType === 'FIXED') {
      if (
        numericValue === undefined ||
        !Number.isFinite(numericValue) ||
        numericValue <= 0 ||
        numericValue > limits.maxFixedDiscount
      ) {
        return setError(
          `Enter a fixed amount above zero and up to $${limits.maxFixedDiscount.toFixed(2)}.`,
        );
      }
    }

    const minimum = minOrder.trim() === '' ? undefined : Number(minOrder);
    if (
      minimum !== undefined &&
      (!Number.isFinite(minimum) ||
        minimum < 0 ||
        minimum > limits.maxMinimumOrder)
    ) {
      return setError(
        `The minimum order must be between $0 and $${limits.maxMinimumOrder.toFixed(2)}.`,
      );
    }

    const cap = maxDiscount.trim() === '' ? undefined : Number(maxDiscount);
    if (
      cap !== undefined &&
      (!Number.isFinite(cap) || cap < 0 || cap > limits.maxDiscountCap)
    ) {
      return setError(
        `The maximum discount must be between $0 and $${limits.maxDiscountCap.toFixed(2)}.`,
      );
    }

    const totalUses = Number(usageLimit);
    if (
      !Number.isInteger(totalUses) ||
      totalUses < 0 ||
      totalUses > limits.maxTotalUses
    ) {
      return setError(
        `Total uses must be a whole number between 0 and ${limits.maxTotalUses}.`,
      );
    }
    if (totalUses > 0 && totalUses < (coupon?.usageCount ?? 0)) {
      return setError(
        'Total uses cannot be lower than the redemptions already made.',
      );
    }

    const perCustomer = Number(perCustomerLimit);
    if (
      !Number.isInteger(perCustomer) ||
      perCustomer < 1 ||
      perCustomer > limits.maxUsesPerCustomer
    ) {
      return setError(
        `Uses per customer must be between 1 and ${limits.maxUsesPerCustomer}.`,
      );
    }

    const expiry = fromDateInputValue(expiresAt);
    if (!expiry) return setError('Choose an expiry date and time.');
    if (new Date(expiry).getTime() <= Date.now()) {
      return setError('The expiry date must be in the future.');
    }
    const starts = fromDateInputValue(startsAt);
    if (starts && new Date(starts).getTime() >= new Date(expiry).getTime()) {
      return setError('The start date must be before the expiry date.');
    }

    if (allowGlobal && scope === 'RESTAURANT' && !restaurantId) {
      return setError('Choose the restaurant this coupon belongs to.');
    }

    setError(null);
    onSave({
      code: normalisedCode,
      title: title.trim(),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      imageKey,
      discountType,
      ...(discountType !== 'FREE_DELIVERY' && numericValue !== undefined
        ? { value: numericValue }
        : {}),
      ...(minimum !== undefined ? { minOrder: minimum } : {}),
      ...(cap !== undefined ? { maxDiscount: cap } : {}),
      ...(starts ? { startsAt: starts } : {}),
      expiresAt: expiry,
      ...(allowGlobal
        ? {
            scope,
            ...(scope === 'RESTAURANT' ? { restaurantId } : {}),
          }
        : {}),
      usageLimit: totalUses,
      perCustomerLimit: perCustomer,
      firstOrderOnly,
      active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-olive-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-editor-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-panel border border-olive-900/10 bg-cream p-6 shadow-lift"
      >
        <h2 id="coupon-editor-title" className="text-[1.25rem] text-olive-900">
          {mode === 'create' ? 'Create a coupon' : 'Edit coupon'}
        </h2>
        <p className="mt-1 text-[0.75rem] text-olive-500">
          {allowGlobal
            ? 'Global coupons work platform-wide. Restaurant coupons only apply to orders from the chosen restaurant.'
            : `This coupon belongs to ${restaurantName ?? 'your restaurant'}. Platform limits are applied automatically.`}
        </p>

        <div className="mt-5 space-y-5">
          <section className="space-y-3.5">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
              Campaign
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                disabled={codeLocked}
                maxLength={24}
                hint={
                  codeLocked
                    ? 'The code is locked once the coupon has been redeemed.'
                    : 'Case-insensitive; stored in capitals.'
                }
              />
              <Input
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </div>

            <Input
              label="Subtitle (optional)"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              maxLength={180}
            />
            <Textarea
              label="Description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={1000}
            />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select
                label="Offer artwork"
                value={imageKey}
                onChange={(event) => setImageKey(event.target.value)}
                options={OFFER_IMAGE_KEYS.map((key) => ({
                  value: key,
                  label: key.replace('offer-', '').replace(/-/g, ' '),
                }))}
              />
              {allowGlobal ? (
                <Select
                  label="Scope"
                  value={scope}
                  onChange={(event) => {
                    const next = event.target.value as PromotionScope;
                    setScope(next);
                    if (next === 'RESTAURANT' && !restaurantId) {
                      setRestaurantId(restaurants[0]?.id ?? '');
                    }
                  }}
                  disabled={codeLocked}
                  options={[
                    { value: 'GLOBAL', label: 'Global — all restaurants' },
                    { value: 'RESTAURANT', label: 'Restaurant — scoped' },
                  ]}
                  hint={
                    codeLocked
                      ? 'Ownership is locked after a redemption.'
                      : undefined
                  }
                />
              ) : (
                <Input
                  label="Restaurant"
                  value={restaurantName ?? 'Your restaurant'}
                  readOnly
                  disabled
                />
              )}
            </div>

            {allowGlobal && scope === 'RESTAURANT' ? (
              <Select
                label="Eligible restaurant"
                value={restaurantId}
                onChange={(event) => setRestaurantId(event.target.value)}
                disabled={codeLocked}
                options={restaurants.map((restaurant) => ({
                  value: restaurant.id,
                  label: restaurant.name,
                }))}
                hint="Only orders from this restaurant can redeem the coupon."
              />
            ) : null}
          </section>

          <section className="space-y-3.5">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
              Discount
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select
                label="Discount type"
                value={discountType}
                onChange={(event) => {
                  const next = event.target.value as PromotionDiscountType;
                  setDiscountType(next);
                  if (next === 'FREE_DELIVERY') setValue('');
                }}
                options={(
                  Object.keys(DISCOUNT_TYPE_LABELS) as PromotionDiscountType[]
                ).map((key) => ({
                  value: key,
                  label: DISCOUNT_TYPE_LABELS[key],
                }))}
              />
              {discountType === 'FREE_DELIVERY' ? (
                <Input
                  label="Delivery fee covered"
                  value="The full server-computed delivery fee"
                  readOnly
                  disabled
                />
              ) : (
                <Input
                  label={
                    discountType === 'PERCENTAGE'
                      ? 'Percentage off'
                      : 'Amount off (USD)'
                  }
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  inputMode="decimal"
                  hint={
                    discountType === 'PERCENTAGE'
                      ? `1–${limits.maxPercentage}%`
                      : `Up to $${limits.maxFixedDiscount.toFixed(2)}`
                  }
                />
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Minimum order (USD, optional)"
                value={minOrder}
                onChange={(event) => setMinOrder(event.target.value)}
                inputMode="decimal"
                hint="Leave blank for no minimum."
              />
              <Input
                label="Maximum discount (USD, optional)"
                value={maxDiscount}
                onChange={(event) => setMaxDiscount(event.target.value)}
                inputMode="decimal"
                hint="Caps percentage and free-delivery discounts."
              />
            </div>
          </section>

          <section className="space-y-3.5">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-terracotta-600">
              Availability
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                type="datetime-local"
                label="Starts (optional)"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
              <Input
                type="datetime-local"
                label="Expires"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Total uses (0 = unlimited)"
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
                inputMode="numeric"
                hint={`Maximum ${limits.maxTotalUses}.`}
              />
              <Input
                label="Uses per customer"
                value={perCustomerLimit}
                onChange={(event) => setPerCustomerLimit(event.target.value)}
                inputMode="numeric"
                hint={`1–${limits.maxUsesPerCustomer}.`}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-olive-900/10 bg-ivory/60 p-3.5">
              <Checkbox
                label="First order only"
                description="Only customers without a prior non-cancelled order can redeem."
                checked={firstOrderOnly}
                onChange={(event) => setFirstOrderOnly(event.target.checked)}
              />
              <Checkbox
                label="Active"
                description="Inactive coupons stay saved but cannot be redeemed."
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </div>
          </section>

          {error ? (
            <p className="text-[0.75rem] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} isLoading={isSaving}>
            {mode === 'create' ? 'Create coupon' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
