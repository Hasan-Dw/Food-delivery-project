import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flame, Leaf, Plus, Star } from 'lucide-react';
import type { Product, Restaurant } from '@/types';
import { Image } from '@/components/ui/Image';
import { DishDetailDialog } from '@/features/menu/components/DishDetailDialog';
import { ROUTES } from '@/config/routes';
import { defaultSelectedOptions } from '@/lib/product-options';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/stores/toast-store';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

interface DishCardProps {
  product: Product;
  restaurant?: Restaurant;
  priority?: boolean;
  className?: string;
}

export function DishCard({ product, restaurant, priority = false, className }: DishCardProps) {
  const addProduct = useCartStore((state) => state.addProduct);
  const notify = useToast();
  const [added, setAdded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const resetTimer = useRef<number | null>(null);

  const price = product.price;

  const handleAdd = () => {
    if (!restaurant) return;
    const { replacedRestaurant } = addProduct({
      product,
      restaurantName: restaurant.name,
      deliveryFee: restaurant.deliveryFee,
      selectedOptions: defaultSelectedOptions(product),
    });

    notify({
      tone: 'success',
      title: `${product.name} added`,
      description: replacedRestaurant
        ? `We started a new cart with ${restaurant.name}.`
        : `${restaurant.name} · ${formatCurrency(price)}`,
    });

    setAdded(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  const openDetails = () => {
    if (restaurant) setDetailsOpen(true);
  };

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-card border border-olive-900/8 bg-cream p-3 shadow-[0_1px_0_rgba(73,56,46,0.03)] transition duration-500 ease-out-soft hover:-translate-y-1 hover:border-olive-900/15 hover:shadow-card',
        className,
      )}
    >
      <button
        type="button"
        onClick={openDetails}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-[0.75rem] bg-ivory-200 text-left focus-visible:outline-offset-4"
        aria-label={`View details for ${product.name}${restaurant ? ` from ${restaurant.name}` : ''}`}
        disabled={!restaurant}
      >
        <Image
          imageKey={product.imageKey}
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"
          priority={priority}
          imageClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-olive-900/30 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {product.isVegetarian ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream/90 text-olive-600 shadow-sm" title="Vegetarian">
              <Leaf aria-hidden="true" className="h-3 w-3" />
            </span>
          ) : null}
          {product.isSpicy ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cream/90 text-terracotta shadow-sm" title="Spicy">
              <Flame aria-hidden="true" className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-ivory/95 px-2 py-1 text-[0.6875rem] font-semibold text-olive-800 backdrop-blur">
          <Star aria-hidden="true" className="h-3 w-3 fill-gold-300 text-gold-500" />
          {product.rating?.toFixed(1) ?? restaurant?.rating.toFixed(1) ?? '4.8'}
        </span>
      </button>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3.5">
        {restaurant ? (
          <Link
            to={ROUTES.restaurantDetails(restaurant.slug)}
            className="w-fit text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-olive-500 transition-colors hover:text-terracotta-600"
          >
            {restaurant.name}
          </Link>
        ) : null}

        <h3 className="mt-1.5 font-display text-[1.15rem] leading-snug text-olive-900">
          <button
            type="button"
            onClick={openDetails}
            disabled={!restaurant}
            className="text-left transition-colors hover:text-terracotta-600 focus-visible:outline-offset-4 disabled:cursor-default"
          >
            {product.name}
          </button>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-olive-500">
          {product.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={openDetails}
            disabled={!restaurant}
            className="text-left text-[0.9375rem] font-semibold text-olive-900 transition-colors hover:text-terracotta-600 disabled:cursor-default"
            aria-label={`Open ${product.name} details and quantity`}
          >
            {formatCurrency(price)}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.75rem] font-medium transition-all duration-300 focus-visible:outline-offset-4',
              added
                ? 'bg-olive-700 text-cream'
                : 'bg-terracotta-600 text-cream shadow-soft hover:bg-terracotta-700 hover:shadow-lift',
            )}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <>
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Added
              </>
            ) : (
              <>
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </button>
        </div>
      </div>

      {detailsOpen && restaurant ? (
        <DishDetailDialog
          product={product}
          restaurant={restaurant}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </article>
  );
}
