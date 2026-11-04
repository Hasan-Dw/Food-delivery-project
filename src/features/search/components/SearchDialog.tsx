import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Clock3, Search, Sparkles, Star, X } from 'lucide-react';
import type { Restaurant, RestaurantCategory } from '@/types';
import { Image } from '@/components/ui/Image';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { useSearchDialogStore } from '@/stores/search-dialog-store';
import { scrollToSection } from '@/lib/scroll';
import { formatCurrency, formatDeliveryWindow } from '@/lib/format';
import { useSearchResults, type DishResult } from '../hooks/useSearchResults';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Marketplace search, presented as a floating dialog rather than an inline
 * form. Results reuse the same discovery store as the homepage rail, so the
 * existing filtering behaviour is preserved.
 */
export function SearchDialog() {
  const isOpen = useSearchDialogStore((state) => state.isOpen);
  const close = useSearchDialogStore((state) => state.close);
  const setSearch = useDiscoveryStore((state) => state.setSearch);
  const setCategory = useDiscoveryStore((state) => state.setCategory);

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = useId();

  const results = useSearchResults(query);

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );

      if (focusable.length === 0) return;

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
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const finish = () => {
    close();
    window.setTimeout(() => scrollToSection('restaurants'), 80);
  };

  const applySearch = (value: string) => {
    setSearch(value);
    setCategory(null);
    finish();
  };

  const applyCategory = (slug: string) => {
    setSearch('');
    setCategory(null);
    setCategory(slug);
    finish();
  };

  const applyRestaurant = (restaurant: Restaurant) => applySearch(restaurant.name);

  const applyDish = (dish: DishResult) => applySearch(dish.restaurant?.name ?? dish.product.name);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    applySearch(value);
  };

  const showEmpty = !results.isSuggestions && !results.isLoading && !results.isError && results.total === 0;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto p-3 sm:p-6">
      <div
        aria-hidden="true"
        className="fixed inset-0 animate-fade-in bg-ink/40 backdrop-blur-[3px]"
        onClick={close}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto mt-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl animate-chip-in flex-col overflow-hidden rounded-panel border border-olive-900/10 bg-ivory shadow-lift sm:mt-[7vh] sm:max-h-[min(46rem,86vh)]"
      >
        <h2 id={titleId} className="sr-only">
          Search Savora
        </h2>

        <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2 border-b border-olive-900/10 p-3 sm:gap-3 sm:p-4">
          <Search aria-hidden="true" className="ml-1 h-5 w-5 shrink-0 text-terracotta-600" />

          <label htmlFor={inputId} className="sr-only">
            Search restaurants, dishes or cuisines
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            name="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search restaurants, dishes or cuisines"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink placeholder:text-olive-500 focus:outline-none sm:text-base"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-800"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}

          <kbd className="hidden shrink-0 rounded-md border border-olive-900/15 bg-cream px-1.5 py-0.5 text-[0.625rem] font-medium text-olive-500 sm:inline-block">
            Esc
          </kbd>

          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-olive-900/12 bg-cream/70 text-olive-700 transition hover:border-olive-900/25 hover:bg-cream hover:text-olive-900"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4">
          <p aria-live="polite" className="sr-only">
            {results.isSuggestions
              ? 'Popular searches and suggestions'
              : results.isLoading
                ? 'Searching'
                : `${results.total} ${results.total === 1 ? 'result' : 'results'}`}
          </p>

          {results.isLoading ? (
            <div className="space-y-2 px-1" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl p-2.5">
                  <div className="h-12 w-12 animate-pulse rounded-lg bg-ivory-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-ivory-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded-full bg-ivory-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.isError ? (
            <div className="px-3 py-10 text-center">
              <p className="font-display text-xl text-olive-900">Search is taking a moment</p>
              <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-olive-500">
                The demo catalogue did not respond. Your existing filters are unchanged.
              </p>
              <button
                type="button"
                onClick={results.refetch}
                className="mt-4 inline-flex h-9 items-center rounded-full border border-olive-900/20 px-4 text-[0.75rem] font-medium text-olive-700 transition hover:border-olive-900/35 hover:bg-cream"
              >
                Try again
              </button>
            </div>
          ) : showEmpty ? (
            <div className="px-3 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-50 text-terracotta-700">
                <Search aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-xl text-olive-900">Nothing at the table for “{query.trim()}”</p>
              <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-olive-500">
                Try a cuisine, a kitchen name or a dish. You can also browse every kitchen on the home page.
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-4 inline-flex h-9 items-center rounded-full border border-olive-900/20 px-4 text-[0.75rem] font-medium text-olive-700 transition hover:border-olive-900/35 hover:bg-cream"
              >
                Clear search
              </button>
            </div>
          ) : results.isSuggestions ? (
            <div className="space-y-5">
              <section aria-labelledby="search-popular-heading">
                <p
                  id="search-popular-heading"
                  className="px-2 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-olive-500"
                >
                  Popular searches
                </p>
                <div className="flex flex-wrap gap-2 px-1">
                  {results.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setQuery(category.name)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-olive-900/12 bg-cream/70 px-3 py-1.5 text-[0.75rem] text-olive-700 transition hover:border-olive-900/25 hover:bg-cream hover:text-olive-900"
                    >
                      <Sparkles aria-hidden="true" className="h-3 w-3 text-gold-500" />
                      {category.name}
                    </button>
                  ))}
                </div>
              </section>

              {results.restaurants.length ? (
                <Section label="Kitchens near you">
                  {results.restaurants.map((restaurant) => (
                    <RestaurantRow key={restaurant.id} restaurant={restaurant} onSelect={applyRestaurant} />
                  ))}
                </Section>
              ) : null}

              {results.dishes.length ? (
                <Section label="Trending dishes">
                  {results.dishes.map((dish) => (
                    <DishRow key={dish.product.id} dish={dish} onSelect={applyDish} />
                  ))}
                </Section>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              {results.categories.length ? (
                <Section label="Cuisines">
                  {results.categories.map((category) => (
                    <CategoryRow key={category.id} category={category} onSelect={applyCategory} />
                  ))}
                </Section>
              ) : null}

              {results.restaurants.length ? (
                <Section label="Restaurants">
                  {results.restaurants.map((restaurant) => (
                    <RestaurantRow key={restaurant.id} restaurant={restaurant} onSelect={applyRestaurant} />
                  ))}
                </Section>
              ) : null}

              {results.dishes.length ? (
                <Section label="Dishes">
                  {results.dishes.map((dish) => (
                    <DishRow key={dish.product.id} dish={dish} onSelect={applyDish} />
                  ))}
                </Section>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-olive-900/10 bg-cream/60 px-4 py-3 text-[0.6875rem] text-olive-500">
          <span>Results narrow the home discovery rail.</span>
          <span className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-olive-900/15 bg-ivory px-1.5 py-0.5 text-[0.625rem]">↵</kbd>
              to search
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-olive-900/15 bg-ivory px-1.5 py-0.5 text-[0.625rem]">Esc</kbd>
              to close
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="px-2 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-olive-500">{label}</p>
      <ul role="list" className="space-y-0.5">
        {children}
      </ul>
    </section>
  );
}

function ResultButton({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-cream focus-visible:outline-offset-2"
      >
        {children}
      </button>
    </li>
  );
}

function Thumb({ imageKey }: { imageKey: string }) {
  return (
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ivory-200">
      <Image imageKey={imageKey} alt="" sizes="48px" />
    </span>
  );
}

function RestaurantRow({ restaurant, onSelect }: { restaurant: Restaurant; onSelect: (restaurant: Restaurant) => void }) {
  return (
    <ResultButton
      onClick={() => onSelect(restaurant)}
      ariaLabel={`Show ${restaurant.name} in the home discovery rail`}
    >
      <Thumb imageKey={restaurant.imageKey} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.05rem] leading-snug text-olive-900">
          {restaurant.name}
        </span>
        <span className="mt-0.5 block truncate text-[0.6875rem] text-olive-500">
          {restaurant.cuisines.join(' · ')}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 text-[0.6875rem] text-olive-500 sm:flex">
        <Star aria-hidden="true" className="h-3 w-3 fill-gold-300 text-gold-500" />
        {restaurant.rating.toFixed(1)}
        <span className="text-olive-300">·</span>
        <Clock3 aria-hidden="true" className="h-3 w-3" />
        {formatDeliveryWindow(restaurant.estimatedDeliveryMinutes)}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-olive-300 transition group-hover:translate-x-0.5 group-hover:text-terracotta-600"
      />
    </ResultButton>
  );
}

function DishRow({ dish, onSelect }: { dish: DishResult; onSelect: (dish: DishResult) => void }) {
  const { product, restaurant } = dish;

  return (
    <ResultButton
      onClick={() => onSelect(dish)}
      ariaLabel={`Show ${product.name}${restaurant ? ` from ${restaurant.name}` : ''} in the home discovery rail`}
    >
      <Thumb imageKey={product.imageKey} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.05rem] leading-snug text-olive-900">{product.name}</span>
        <span className="mt-0.5 block truncate text-[0.6875rem] text-olive-500">
          {restaurant?.name ?? 'Savora kitchen'}
        </span>
      </span>
      <span className="shrink-0 text-[0.8125rem] font-medium tabular-nums text-olive-800">
        {formatCurrency(product.price)}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-olive-300 transition group-hover:translate-x-0.5 group-hover:text-terracotta-600"
      />
    </ResultButton>
  );
}

function CategoryRow({ category, onSelect }: { category: RestaurantCategory; onSelect: (slug: string) => void }) {
  return (
    <ResultButton
      onClick={() => onSelect(category.slug)}
      ariaLabel={`Filter the home discovery rail to ${category.name}`}
    >
      <Thumb imageKey={category.imageKey} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.05rem] leading-snug text-olive-900">{category.name}</span>
        <span className="mt-0.5 block truncate text-[0.6875rem] text-olive-500">{category.description}</span>
      </span>
      <span className="shrink-0 text-[0.6875rem] text-olive-500">{category.itemCount} places</span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-olive-300 transition group-hover:translate-x-0.5 group-hover:text-terracotta-600"
      />
    </ResultButton>
  );
}
