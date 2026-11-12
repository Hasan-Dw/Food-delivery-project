import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { DishCard } from '@/features/home/components/DishCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { useHomeData } from '@/features/home/hooks/useHomeData';

/**
 * Cross-restaurant dish rail. Add-to-cart is wired to the shared cart store;
 * the cart and checkout pages themselves belong to Team Member 2.
 */
export function PopularDishes() {
  const { popularDishes, restaurants } = useHomeData();

  const restaurantById = useMemo(() => {
    const map = new Map((restaurants.data?.items ?? []).map((restaurant) => [restaurant.id, restaurant]));
    return map;
  }, [restaurants.data]);

  return (
    <section id="dishes" className="section relative overflow-hidden bg-ivory">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-24 h-[24rem] w-[24rem] rounded-full border border-terracotta/10"
      />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            eyebrow="Ordered again and again"
            title={
              <>
                Dishes worth <em className="italic text-terracotta">crossing the borough for.</em>
              </>
            }
            description="A short list of the plates our diners reorder most — from twelve-hour brisket to a very serious bowl of ramen."
            action={
              <p className="inline-flex items-center gap-2 rounded-full bg-terracotta-50 px-4 py-2.5 text-[0.75rem] font-medium text-terracotta-700 ring-1 ring-inset ring-terracotta-100">
                <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                Trending this week
              </p>
            }
          />
        </Reveal>

        {popularDishes.isLoading ? (
          <div className="mt-9 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-card border border-olive-900/8 bg-cream p-3">
                <Skeleton className="aspect-[4/3] rounded-[0.75rem]" />
                <Skeleton className="mt-4 h-5 w-4/5" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-2/3" />
                <Skeleton className="mt-5 h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : popularDishes.isError ? (
          <ErrorState
            className="mt-9"
            title="The popular dishes did not load"
            description="You can still browse the restaurants above. Try this rail again in a moment."
            action={
              <Button variant="outline" size="sm" onClick={() => popularDishes.refetch()}>
                Try again
              </Button>
            }
          />
        ) : !popularDishes.data?.length ? (
          <EmptyState
            className="mt-9"
            title="No dishes to show yet"
            description="The kitchens are still deciding what to send out first."
          />
        ) : (
          <div className="mt-9 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {popularDishes.data.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index * 45, 315)}>
                <DishCard product={product} restaurant={restaurantById.get(product.restaurantId)} />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={100}>
          <p className="mt-8 text-center text-[0.6875rem] text-olive-500">
            Adding a dish starts a cart in this preview. Checkout belongs to the cart &amp; order module.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
