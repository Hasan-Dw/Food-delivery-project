import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SearchX, X } from 'lucide-react';
import { RestaurantCard } from '@/features/home/components/RestaurantCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { useSelectedArea } from '@/stores/location-store';

/**
 * The working discovery rail. It reads search intent from the shared store and
 * filters the restaurants the homepage already loaded — no separate listing
 * page is implemented here, by design.
 */
export function PopularRestaurants() {
  const { restaurants, categories } = useHomeData();
  const area = useSelectedArea();
  const search = useDiscoveryStore((state) => state.search);
  const categorySlug = useDiscoveryStore((state) => state.categorySlug);
  const setSearch = useDiscoveryStore((state) => state.setSearch);
  const setCategory = useDiscoveryStore((state) => state.setCategory);
  const reset = useDiscoveryStore((state) => state.reset);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [search, categorySlug]);

  const categoryName = useMemo(
    () => categories.data?.find((category) => category.slug === categorySlug)?.name,
    [categories.data, categorySlug],
  );

  const filtered = useMemo(() => {
    const list = restaurants.data?.items ?? [];
    const term = search.trim().toLowerCase();

    return list.filter((restaurant) => {
      if (categorySlug && !restaurant.categorySlugs.includes(categorySlug)) return false;
      if (!term) return true;
      return [restaurant.name, restaurant.tagline, ...restaurant.cuisines, ...restaurant.categorySlugs]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [restaurants.data, search, categorySlug]);

  const hasFilters = Boolean(search.trim() || categorySlug);
  const visible = showAll ? filtered : filtered.slice(0, 6);

  return (
    <section id="restaurants" className="section border-y border-olive-900/8 bg-cream">
      <div className="shell">
        <Reveal>
          <SectionHeading
            eyebrow="Popular near you"
            title={
              <>
                The kitchens your neighbours <em className="italic text-terracotta">keep returning to.</em>
              </>
            }
            description={`Independent places delivering to ${area.city} ${area.postalCode} right now. Search or pick a cuisine to narrow the list.`}
            action={
              filtered.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-900/15 bg-ivory px-4 py-2.5 text-[0.75rem] font-medium text-olive-700 transition hover:border-olive-900/30 hover:bg-white"
                >
                  {showAll ? 'Show fewer' : `Show all ${filtered.length} nearby`}
                  {showAll ? (
                    <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null
            }
          />
        </Reveal>

        {hasFilters ? (
          <Reveal>
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-olive-900/10 bg-ivory px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-olive-500">
                  Filtered to
                </span>
                {search.trim() ? (
                  <FilterChip label={`“${search.trim()}”`} onRemove={() => setSearch('')} />
                ) : null}
                {categoryName ? <FilterChip label={categoryName} onRemove={() => setCategory(null)} /> : null}
                <span className="text-[0.75rem] text-olive-500">
                  {filtered.length} {filtered.length === 1 ? 'restaurant' : 'restaurants'}
                </span>
              </div>

              <button
                type="button"
                onClick={reset}
                className="self-start text-[0.75rem] font-medium text-terracotta-600 underline-offset-4 transition hover:text-terracotta-700 hover:underline sm:self-auto"
              >
                Clear all filters
              </button>
            </div>
          </Reveal>
        ) : null}

        {restaurants.isLoading ? (
          <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="aspect-[16/10] rounded-card" />
                <Skeleton className="mt-4 h-6 w-2/3" />
                <Skeleton className="mt-2.5 h-3 w-1/3" />
                <Skeleton className="mt-4 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : restaurants.isError ? (
          <ErrorState
            className="mt-9"
            title="We could not bring the restaurants to the table"
            description="The demo data source did not respond. Nothing you have saved has been lost."
            action={
              <Button variant="outline" size="sm" onClick={() => restaurants.refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            className="mt-9"
            icon={<SearchX aria-hidden="true" className="h-6 w-6" />}
            title="Nothing matches that combination yet"
            description={`We could not find a ${categoryName?.toLowerCase() ?? 'matching'} kitchen for “${search.trim()}” near ${area.city}. Try a broader search or clear the filters.`}
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="mt-9 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((restaurant, index) => (
                <Reveal key={restaurant.id} delay={Math.min(index * 55, 275)}>
                  <RestaurantCard restaurant={restaurant} priority={index < 3} />
                </Reveal>
              ))}
            </div>

            {filtered.length > 6 && !showAll ? (
              <div className="mt-11 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-olive-900/20 bg-cream px-6 text-[0.8125rem] font-medium text-olive-700 transition hover:border-olive-900/35 hover:bg-white"
                >
                  Show {filtered.length - 6} more kitchens
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                </button>
                <p className="text-[0.6875rem] text-olive-500">
                  The full restaurant directory is part of the discovery module.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-700 py-1 pl-3 pr-1 text-[0.6875rem] font-medium text-cream">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-cream/70 transition hover:bg-cream/15 hover:text-cream"
      >
        <X aria-hidden="true" className="h-3 w-3" />
      </button>
    </span>
  );
}
