import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  Flame,
  Leaf,
  MapPin,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import type { Product, Restaurant } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ROUTES } from '@/config/routes';
import { defaultSelectedOptions, optionAdjustedPrice } from '@/lib/product-options';
import { formatCurrency, formatDeliveryWindow } from '@/lib/format';
import { useCartStore } from '@/stores/cart-store';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useToast } from '@/stores/toast-store';
import { cn } from '@/lib/cn';
import { DishReviews } from '@/features/reviews/components/DishReviews';
import { StarDisplay } from '@/features/reviews/components/Stars';

interface DishDetailDialogProps {
  product: Product;
  restaurant: Restaurant;
  onClose: () => void;
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared interactive food modal used by the homepage rail and the restaurant
 * menu. It carries the dish image, description, price, dish and restaurant
 * ratings, a quantity selector and a real add-to-cart action.
 */
export function DishDetailDialog({ product, restaurant, onClose }: DishDetailDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [quantity, setQuantity] = useState(1);
  const addProduct = useCartStore((state) => state.addProduct);
  const notify = useToast();

  const selectedOptions = useMemo(() => defaultSelectedOptions(product), [product]);
  const unitPrice = optionAdjustedPrice(product, selectedOptions);
  const total = unitPrice * quantity;

  useBodyScrollLock(true);

  const requestClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [requestClose]);

  const handleAdd = () => {
    const { replacedRestaurant } = addProduct({
      product,
      restaurantName: restaurant.name,
      deliveryFee: restaurant.deliveryFee,
      quantity,
      selectedOptions,
    });

    notify({
      tone: 'success',
      title: `${quantity} × ${product.name} added`,
      description: replacedRestaurant
        ? `We started a new cart with ${restaurant.name}.`
        : `${restaurant.name} · ${formatCurrency(total)}`,
    });
    requestClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div
        aria-hidden="true"
        className="animate-fade-in fixed inset-0 bg-ink/60 backdrop-blur-[10px]"
        onClick={requestClose}
      />

      <div className="relative flex min-h-[100dvh] items-end justify-center p-0 sm:min-h-0 sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="animate-chip-in relative flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-y-auto overscroll-contain rounded-t-panel border border-olive-900/10 bg-ivory shadow-lift sm:max-h-[90dvh] sm:rounded-panel"
        >
          <div className="grid sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="relative h-56 shrink-0 overflow-hidden bg-ivory-200 sm:h-auto sm:min-h-[30rem]">
              <Image
                imageKey={product.imageKey}
                alt={product.name}
                priority
                sizes="(min-width: 640px) 26rem, 100vw"
                className="h-full w-full"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/45 to-transparent sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-16 sm:bg-gradient-to-l" />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={requestClose}
                aria-label="Close dish details"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-cream/60 bg-ink/40 text-cream backdrop-blur-md transition hover:bg-ink/60 focus-visible:outline-offset-2"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>

              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {product.isVegetarian ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cream/90 text-olive-600 shadow-sm" title="Vegetarian">
                    <Leaf aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                {product.isSpicy ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cream/90 text-terracotta shadow-sm" title="Spicy">
                    <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-col p-4 pb-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow text-terracotta-700">From the kitchen</p>
                  <h2 id={titleId} className="mt-2 font-display text-[1.6rem] leading-tight text-olive-900 sm:text-display-sm">
                    {product.name}
                  </h2>
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-olive-900">
                  {formatCurrency(unitPrice)}
                </p>
              </div>

              <p className="mt-3 text-[0.8125rem] leading-6 text-olive-600">{product.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.isVegetarian ? <Badge tone="success">Vegetarian</Badge> : null}
                {product.isSpicy ? <Badge tone="terracotta">Spicy</Badge> : null}
                {product.isPopular ? <Badge tone="gold">Popular</Badge> : null}
                {product.calories ? <Badge tone="outline">{product.calories} cal</Badge> : null}
              </div>

              <Link
                to={ROUTES.restaurantDetails(restaurant.slug)}
                className="mt-4 flex items-center gap-3 rounded-xl border border-olive-900/10 bg-white/60 p-2.5 transition hover:border-olive-900/25 hover:bg-white"
              >
                <Image
                  imageKey={restaurant.logoKey ?? restaurant.imageKey}
                  alt={restaurant.name}
                  sizes="48px"
                  className="h-11 w-11 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
                    Made by
                  </p>
                  <p className="truncate text-[0.8125rem] font-semibold text-olive-900">{restaurant.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-olive-500">
                    <span className="inline-flex items-center gap-1">
                      <Star aria-hidden="true" className="h-3 w-3 fill-gold-300 text-gold-500" />
                      {restaurant.reviewCount ? restaurant.rating.toFixed(1) : 'New'}
                      {restaurant.reviewCount ? ` (${restaurant.reviewCount})` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 aria-hidden="true" className="h-3 w-3" />
                      {formatDeliveryWindow(restaurant.estimatedDeliveryMinutes)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="h-3 w-3" />
                      {restaurant.address.city}
                    </span>
                  </div>
                </div>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-olive-400" />
              </Link>

              <div className="mt-4">
                <DishReviews
                  menuItemId={product.id}
                  fallbackRating={product.rating ?? restaurant.rating}
                  fallbackCount={product.reviewCount ?? 0}
                />
              </div>

              {product.optionGroups.length ? (
                <div className="mt-4 rounded-xl border border-olive-900/10 bg-white/50 p-3">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
                    Included choices
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {product.optionGroups.map((group) => {
                      const chosen = selectedOptions.find((option) => option.groupId === group.id);
                      return (
                        <div key={group.id} className="rounded-lg bg-cream px-2.5 py-2">
                          <p className="text-[0.6875rem] font-semibold text-olive-900">{group.name}</p>
                          <p className="mt-0.5 truncate text-[0.6875rem] text-olive-500">
                            {chosen?.optionName ?? 'Chef selected'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="sm:mt-auto">
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-olive-900/10 pt-4">
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
                      Quantity
                    </p>
                    <QuantityStepper className="mt-1.5" value={quantity} onChange={setQuantity} label="Dish quantity" />
                  </div>
                  <div className="text-right">
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500">
                      Total
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-olive-900">
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>

                <Button
                  className="mt-3 w-full"
                  size="lg"
                  onClick={handleAdd}
                  disabled={!product.available}
                  iconLeft={<ShoppingBag aria-hidden="true" className="h-4 w-4" />}
                >
                  {product.available ? `Add ${quantity} to cart` : 'Currently unavailable'}
                </Button>
                <p className={cn('mt-2 text-center text-[0.6875rem] text-olive-500')}>
                  {restaurant.name} · {formatCurrency(unitPrice)} each ·{' '}
                  <StarDisplay value={product.rating ?? restaurant.rating} size="xs" className="align-middle" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
