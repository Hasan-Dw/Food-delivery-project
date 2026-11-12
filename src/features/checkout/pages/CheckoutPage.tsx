import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, ShieldCheck, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/app/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';
import { useCartStore } from '@/stores/cart-store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { getErrorMessage } from '@/services/api/errors';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Address, AddressLabel } from '@/types';
import { DeliveryAddressForm } from '../components/DeliveryAddressForm';
import { OrderReview } from '../components/OrderReview';
import { PaymentMethodSelector, CASH_ON_DELIVERY_ID } from '../components/PaymentMethodSelector';
import { CheckoutSummary } from '../components/CheckoutSummary';
import { useCheckout } from '../hooks/useCheckout';

type AddressField = 'line1' | 'city' | 'state' | 'postalCode' | 'country';
type CheckoutErrors = {
  customerName?: string;
  customerPhone?: string;
  paymentMethodId?: string;
  address?: Partial<Record<AddressField, string>>;
  form?: string;
};

function createAddress(userId: string): Address {
  return {
    id: `checkout-${userId}`,
    label: 'Other' satisfies AddressLabel,
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    isDefault: false,
  };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const restaurantName = useCartStore((state) => state.restaurantName);
  const couponCode = useCartStore((state) => state.couponCode);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const removeCoupon = useCartStore((state) => state.removeCoupon);
  const { mutation, partialOrder } = useCheckout();
  const [address, setAddress] = useState<Address>(() => createAddress(user?.id ?? 'guest'));
  const [addressEdited, setAddressEdited] = useState(false);
  const [customerName, setCustomerName] = useState(user?.fullName ?? '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  useDocumentTitle('Checkout');

  const restaurant = useQuery({
    queryKey: restaurantId ? queryKeys.restaurant(restaurantId) : ['restaurants', 'checkout-empty'],
    queryFn: () => services.restaurants.getById(restaurantId ?? ''),
    enabled: Boolean(restaurantId),
  });
  const addresses = useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => services.users.listAddresses(),
    enabled: isAuthenticated,
  });
  const paymentMethods = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: () => services.users.listPaymentMethods(),
    enabled: isAuthenticated,
  });
  const quoteSignature = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.productId}x${item.quantity}:${item.selectedOptions
              .map((option) => option.optionId)
              .sort()
              .join(',')}`,
        )
        .join('|'),
    [items],
  );
  const localSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );
  const quote = useQuery({
    queryKey: queryKeys.checkoutQuote(
      restaurantId ?? 'none',
      quoteSignature,
      couponCode ?? 'none',
    ),
    queryFn: () =>
      services.checkout.quote({
        restaurantId: restaurantId ?? '',
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          notes: item.notes,
        })),
        couponCode: couponCode ?? undefined,
      }),
    enabled:
      Boolean(restaurantId && items.length) &&
      isAuthenticated &&
      user?.role === 'CUSTOMER',
  });
  const appliedCoupon = quote.data?.promotion;
  const couponMutation = useMutation({
    mutationFn: (code: string) =>
      services.promotions.validate({
        code,
        restaurantId: restaurantId ?? undefined,
        subtotal: quote.data?.subtotal ?? localSubtotal,
      }),
    onSuccess: (result) => {
      if (result.valid) {
        setCoupon(result.code);
        setCouponInput(result.code);
        setCouponFeedback(
          result.message ?? `${result.title ?? 'Promotion'} applied to this order.`,
        );
      } else {
        removeCoupon();
        setCouponFeedback(result.message ?? 'That code cannot be used for this order.');
      }
    },
    onError: (error) => {
      setCouponFeedback(getErrorMessage(error, 'We could not check that code. Please try again.'));
    },
  });
  const lockedAfterOrder = Boolean(partialOrder);
  const busy = mutation.isPending;
  const paymentMethodSelected = paymentMethods.data?.length
    ? Boolean(paymentMethodId && paymentMethods.data.some((method) => method.id === paymentMethodId))
    : paymentMethodId === CASH_ON_DELIVERY_ID;
  const canSubmit =
    Boolean(user && user.role === 'CUSTOMER') &&
    items.length > 0 &&
    Boolean(restaurantId && restaurant.data) &&
    Boolean(quote.data) &&
    !quote.isLoading &&
    !quote.isError &&
    paymentMethodSelected &&
    !busy;
  useEffect(() => {
    if (!addressEdited && addresses.data?.length) {
      const selected = addresses.data.find((entry) => entry.isDefault) ?? addresses.data[0];
      setAddress({ ...selected });
    }
  }, [addressEdited, addresses.data]);

  useEffect(() => {
    if (!paymentMethods.data) return;
    if (paymentMethods.data.length) {
      const stillValid = paymentMethods.data.some((method) => method.id === paymentMethodId);
      if (!stillValid) {
        setPaymentMethodId(
          (paymentMethods.data.find((method) => method.isDefault) ?? paymentMethods.data[0]).id,
        );
      }
    } else if (paymentMethodId !== CASH_ON_DELIVERY_ID) {
      setPaymentMethodId(CASH_ON_DELIVERY_ID);
    }
  }, [paymentMethodId, paymentMethods.data]);

  useEffect(() => {
    if (user) {
      setCustomerName(user.fullName);
      setCustomerPhone(user.phone);
    }
  }, [user]);

  const updateAddress = (next: Address) => {
    setAddressEdited(true);
    setAddress(next);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: CheckoutErrors = {};

    if (!user || !isAuthenticated || user.role !== 'CUSTOMER') {
      nextErrors.form = 'Sign in with a customer account to place an order.';
    }
    if (!items.length) nextErrors.form = 'Your cart is empty. Add items before checking out.';
    if (!restaurantId || !restaurant.data) {
      nextErrors.form = 'We could not confirm the restaurant for this cart. Return to your cart and try again.';
    }
    if (restaurantId && items.some((item) => item.restaurantId !== restaurantId)) {
      nextErrors.form = 'A single order can only include items from one restaurant.';
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      nextErrors.form = 'Check item quantities in your cart. Each item must have a quantity from 1 to 20.';
    }
    if (!customerName.trim()) nextErrors.customerName = 'Enter the name for this order.';
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      nextErrors.customerPhone = 'Enter a valid phone number.';
    }
    const addressErrors: NonNullable<CheckoutErrors['address']> = {};
    for (const field of ['line1', 'city', 'state', 'postalCode', 'country'] as const) {
      if (!address[field].trim()) addressErrors[field] = 'This field is required.';
    }
    if (Object.keys(addressErrors).length) nextErrors.address = addressErrors;
    if (!paymentMethodSelected) {
      nextErrors.paymentMethodId = paymentMethods.data?.length
        ? 'Choose an available saved payment method.'
        : 'Cash on delivery could not be selected. Reload the page and try again.';
    }
    if (quote.isError || !quote.data) {
      nextErrors.form =
        'We could not confirm current prices with the restaurant. Wait a moment and try again.';
    } else if (quote.data.subtotal < quote.data.minOrder) {
      nextErrors.form = 'This order is below the restaurant minimum. Add another item to continue.';
    }
    if (appliedCoupon && !appliedCoupon.valid) {
      nextErrors.form =
        appliedCoupon.message ?? 'Remove the promotion code before placing this order.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !user || !restaurant.data) return;

    try {
      const created = await mutation.mutateAsync({
        customerId: user.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        restaurantId: restaurant.data.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          notes: item.notes,
        })),
        deliveryAddress: { ...address, instructions: address.instructions?.trim() || undefined },
        paymentMethodId,
        couponCode: couponCode ?? undefined,
        notes: orderNotes.trim() || undefined,
      });
      navigate(ROUTES.orderConfirmation(created.id), { replace: true });
    } catch (error) {
      setErrors({
        form: partialOrder
          ? 'Your order was created, but delivery setup did not finish. Retry to safely complete delivery setup without placing the order again.'
          : getErrorMessage(error, 'We could not place your order. Your cart is unchanged; please try again.'),
      });
    }
  };

  if (!isAuthenticated || !user) return <PageLoader label="Checking your account…" />;

  if (!items.length) {
    return (
      <div className="shell py-16 sm:py-24">
        <p className="eyebrow text-terracotta-700">A good meal is close</p>
        <h1 className="mt-3 font-display text-display-md text-olive-900">Your cart is empty</h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-olive-600">
          Add something delicious before continuing to checkout.
        </p>
        <Button className="mt-6" onClick={() => navigate(ROUTES.cart)}>Return to cart</Button>
      </div>
    );
  }

  if (restaurant.isLoading) return <PageLoader label="Preparing your checkout…" />;

  const orderName = restaurant.data?.name ?? restaurantName ?? 'Your restaurant';

  return (
    <div className="shell pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mb-8">
        <Link
          to={ROUTES.cart}
          className="inline-flex items-center gap-2 text-xs font-medium text-olive-600 transition hover:text-olive-900"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back to cart
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-terracotta-700">Almost at the table</p>
            <h1 className="mt-2 font-display text-display-md text-olive-900">Checkout</h1>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-olive-500">Step 2 of 3 · Delivery & payment</p>
        </div>
      </div>

      {restaurant.isError ? (
        <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger" role="alert">
          {getErrorMessage(restaurant.error, 'We could not load this restaurant. Please return to your cart.')}
        </div>
      ) : null}
      {addresses.isError ? (
        <div className="mb-6 rounded-xl border border-olive-900/10 bg-white/70 p-4 text-sm text-olive-600">
          Saved addresses could not be loaded. You can still enter a delivery address below.
        </div>
      ) : null}
      {paymentMethods.isError ? (
        <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger" role="alert">
          Saved payment methods could not be loaded. Try again before placing your order.
          <button type="button" className="ml-2 underline" onClick={() => void paymentMethods.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.56fr)] lg:gap-8">
          <div className="space-y-5">
            <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-7">
              <div className="mb-5">
                <p className="eyebrow text-terracotta-700">Your details</p>
                <h2 className="mt-2 font-display text-[1.65rem] text-olive-900">Who’s receiving this?</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-olive-700">Name</span>
                  <input
                    autoComplete="name"
                    disabled={lockedAfterOrder}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    aria-invalid={Boolean(errors.customerName)}
                    className="w-full rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
                  />
                  {errors.customerName ? <span className="mt-1 block text-xs text-danger">{errors.customerName}</span> : null}
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-olive-700">Phone number</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    disabled={lockedAfterOrder}
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    aria-invalid={Boolean(errors.customerPhone)}
                    className="w-full rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
                  />
                  {errors.customerPhone ? <span className="mt-1 block text-xs text-danger">{errors.customerPhone}</span> : null}
                </label>
              </div>
            </section>

            <DeliveryAddressForm
              address={address}
              onChange={updateAddress}
              errors={errors.address ?? {}}
              disabled={lockedAfterOrder}
            />
            <OrderReview restaurantName={orderName} items={items} />
            <PaymentMethodSelector
              methods={paymentMethods.data ?? []}
              selectedId={paymentMethodId}
              onChange={setPaymentMethodId}
              error={errors.paymentMethodId}
              disabled={lockedAfterOrder || paymentMethods.isLoading}
            />
            <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-7">
              <div className="mb-4">
                <p className="eyebrow text-terracotta-700">One last detail</p>
                <h2 className="mt-2 font-display text-[1.65rem] text-olive-900">Order notes</h2>
              </div>
              <textarea
                rows={3}
                disabled={lockedAfterOrder}
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                placeholder="Anything else the kitchen should know?"
                className="w-full resize-y rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-3 text-sm text-olive-900 outline-none transition placeholder:text-olive-400 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
              />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-2">
                <Tag aria-hidden="true" className="h-4 w-4 text-terracotta-700" />
                <h2 className="font-display text-[1.4rem] text-olive-900">Promotion</h2>
              </div>
              {couponCode ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-olive-900/[0.04] px-3 py-2.5 text-sm">
                  <span className="font-semibold tracking-wide text-olive-800">{couponCode}</span>
                  <button
                    type="button"
                    className="rounded-full p-1 text-olive-500 transition hover:bg-olive-900/10 hover:text-olive-800"
                    aria-label="Remove promotion code"
                    disabled={busy || lockedAfterOrder}
                    onClick={() => {
                      removeCoupon();
                      setCouponInput('');
                      setCouponFeedback(null);
                    }}
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="Promo code"
                    autoComplete="off"
                    disabled={busy || lockedAfterOrder}
                    className="min-w-0 flex-1 rounded-xl border border-olive-900/15 bg-ivory/70 px-3.5 py-2.5 text-sm uppercase tracking-wide text-olive-900 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-olive-400 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !couponInput.trim() || couponMutation.isPending || busy || lockedAfterOrder
                    }
                    onClick={() => couponMutation.mutate(couponInput.trim())}
                  >
                    {couponMutation.isPending ? 'Checking…' : 'Apply'}
                  </Button>
                </div>
              )}
              {couponFeedback ? (
                <p className="mt-2.5 text-xs leading-5 text-olive-600">{couponFeedback}</p>
              ) : null}
              {appliedCoupon && !appliedCoupon.valid && appliedCoupon.message ? (
                <p className="mt-2.5 text-xs leading-5 text-danger" role="alert">
                  {appliedCoupon.message}
                </p>
              ) : null}
              {quote.data && quote.data.subtotal < quote.data.minOrder ? (
                <p className="mt-2.5 text-xs leading-5 text-danger" role="alert">
                  This restaurant has a minimum order of{' '}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(quote.data.minOrder)}
                  .
                </p>
              ) : null}
            </section>

            <CheckoutSummary
              subtotal={quote.data?.subtotal ?? 0}
              deliveryFee={quote.data?.deliveryFee ?? 0}
              serviceFee={quote.data?.serviceFee ?? 0}
              discount={quote.data?.discount ?? 0}
              tax={quote.data?.tax ?? 0}
              total={quote.data?.total ?? 0}
              disabled={!canSubmit || Boolean(partialOrder && busy)}
              isSubmitting={busy}
            />
            {quote.isLoading ? (
              <p className="px-1 text-xs text-olive-500" role="status">
                Confirming current prices with the restaurant…
              </p>
            ) : null}
            {quote.isError ? (
              <div className="flex gap-2 rounded-xl border border-danger/20 bg-danger/5 p-4 text-xs leading-5 text-danger" role="alert">
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{getErrorMessage(quote.error, 'We could not confirm current prices.')}</p>
              </div>
            ) : null}
            {errors.form ? (
              <div className="flex gap-2 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm leading-6 text-danger" role="alert">
                <Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                <p>{errors.form}</p>
              </div>
            ) : null}
            {partialOrder ? (
              <div className="rounded-xl border border-gold-300/50 bg-gold-100/40 p-4 text-xs leading-5 text-olive-700">
                Order {partialOrder.code} is safely saved. Retry to finish creating its pending delivery; your cart remains unchanged until then.
              </div>
            ) : null}
            <div className="flex gap-2 rounded-xl bg-olive-900/[0.04] p-4 text-xs leading-5 text-olive-600">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-olive-700" />
              <p>Prices and item availability are checked again when your order is submitted.</p>
            </div>
            <Button type="button" variant="outline" fullWidth onClick={() => navigate(ROUTES.cart)}>
              Edit your cart
            </Button>
          </aside>
        </div>
      </form>
    </div>
  );
}
