import { ArrowUpRight, Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Restaurant } from '@/types';
import { Image } from '@/components/ui/Image';
import { Rating } from '@/components/ui/Rating';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { ROUTES } from '@/config/routes';
import { formatCurrency, formatDeliveryWindow } from '@/lib/format';

const featureImages: Record<string, string> = {
  res_saffron_oak: 'feature-saffron-plate',
  res_nonna_lucia: 'feature-nonna-pasta',
  res_koji_sushi: 'feature-koji-platter',
};

/**
 * Editorial selection. The visual rhythm is deliberately different from the
 * restaurant grid so the page reads like a magazine, not a catalogue.
 */
export function FeaturedRestaurants() {
  const { featured } = useHomeData();

  return (
    <section id="featured" className="surface-grain section relative overflow-hidden bg-olive-800 text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full border border-cream/8"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-56 left-1/3 h-[30rem] w-[30rem] rounded-full bg-olive-700/40 blur-3xl"
      />

      <div className="shell relative z-10">
        <Reveal>
          <SectionHeading
            tone="light"
            eyebrow="The Savora picks"
            title={
              <>
                Three kitchens worth <em className="italic text-gold-200">clearing an evening for.</em>
              </>
            }
            description="Not the biggest. Not the loudest. Just the places our team books a table at on their nights off — and orders from when they stay in."
            action={
              <p className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2.5 text-[0.75rem] text-cream/70">
                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-gold-300 text-gold-300" />
                Independently owned · updated weekly
              </p>
            }
          />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <Reveal className="lg:pt-2">
            <div className="relative">
              <div className="arch-frame relative aspect-[4/5] max-h-[32rem] overflow-hidden border-[5px] border-cream/10 bg-olive-900">
                <Image
                  imageKey="feature-koji-platter"
                  sizes="(min-width: 1024px) 34vw, 92vw"
                  imageClassName="transition-transform duration-[1200ms] ease-out-soft hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-olive-900/80 via-olive-900/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <Quote aria-hidden="true" className="h-6 w-6 text-gold-300/80" />
                  <p className="mt-3 max-w-xs font-display text-[1.35rem] leading-snug text-cream">
                    “We eat here on our nights off. That is the whole selection criteria.”
                  </p>
                  <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.16em] text-cream/50">
                    The Savora team
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-5 -right-3 hidden rounded-2xl border border-cream/15 bg-olive-900/90 px-5 py-4 shadow-lift backdrop-blur sm:block">
                <p className="font-display text-[1.8rem] leading-none text-gold-200">240+</p>
                <p className="mt-1 text-[0.625rem] uppercase tracking-[0.13em] text-cream/50">
                  independent kitchens
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-cream/12 pt-5">
              <Stat value="4.9" label="Average rating" />
              <Stat value="28" label="Median delivery" />
              <Stat value="12" label="Neighbourhoods" />
            </div>
          </Reveal>

          <div>
            {featured.isLoading ? (
              <div className="divide-y divide-cream/10">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-5 py-6 first:pt-0">
                    <Skeleton className="h-28 w-36 shrink-0 rounded-xl bg-cream/10" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-3 w-16 bg-cream/10" />
                      <Skeleton className="h-6 w-1/2 bg-cream/10" />
                      <Skeleton className="h-3 w-3/4 bg-cream/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : featured.isError ? (
              <ErrorState
                className="border-cream/20 bg-cream/5 text-cream [&_p]:text-cream/60 [&_h2]:text-cream"
                title="The picks are resting"
                description="The featured selection could not load. The rest of the homepage still works."
                action={
                  <Button variant="light" size="sm" onClick={() => featured.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : (
              <ol className="divide-y divide-cream/10">
                {(featured.data ?? []).map((restaurant, index) => (
                  <li key={restaurant.id}>
                    <Reveal delay={index * 80}>
                      <FeaturedRow restaurant={restaurant} index={index} />
                    </Reveal>
                  </li>
                ))}
              </ol>
            )}

            <Reveal delay={200}>
              <p className="mt-8 flex items-start gap-2.5 text-[0.75rem] leading-relaxed text-cream/45">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-300/70" aria-hidden="true" />
                Each pick is visited, tasted and paid for by the Savora team. No paid placements, ever.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedRow({ restaurant, index }: { restaurant: Restaurant; index: number }) {
  const imageKey = featureImages[restaurant.id] ?? restaurant.imageKey;

  return (
    <Link
      to={ROUTES.restaurantDetails(restaurant.slug)}
      className="group grid grid-cols-[auto_7.25rem_1fr_auto] items-center gap-4 py-6 focus-visible:outline-offset-4 sm:gap-5 sm:py-7"
    >
        <span className="hidden font-display text-[1.5rem] text-cream/25 sm:block">
          0{index + 1}
        </span>

        <span className="relative block aspect-[5/4] overflow-hidden rounded-xl bg-olive-900">
          <Image
            imageKey={imageKey}
            sizes="120px"
            imageClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-olive-900/30 to-transparent" />
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-gold-200/80">
              {restaurant.cuisines.join(' · ')}
            </span>
            {restaurant.badges.includes('Top rated') ? (
              <span className="rounded-full bg-cream/10 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-cream/60">
                Top rated
              </span>
            ) : null}
          </span>

          <span className="mt-1.5 block font-display text-[1.6rem] leading-tight text-cream transition-colors duration-300 group-hover:text-gold-200 sm:text-[1.9rem]">
            {restaurant.name}
          </span>
          <span className="mt-1.5 hidden text-[0.8125rem] leading-relaxed text-cream/50 sm:block">
            {restaurant.tagline}
          </span>

          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] text-cream/55">
            <Rating rating={restaurant.rating} reviewCount={restaurant.reviewCount} tone="light" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-gold-300/70" aria-hidden="true" />
              {formatDeliveryWindow(restaurant.estimatedDeliveryMinutes)}
            </span>
            <span className="hidden sm:inline">
              {restaurant.deliveryFee === 0 ? 'Free delivery' : `${formatCurrency(restaurant.deliveryFee)} delivery`}
            </span>
          </span>
        </span>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-all duration-300 group-hover:border-gold-300/60 group-hover:bg-gold-300 group-hover:text-olive-900">
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </Link>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-[1.5rem] leading-none text-cream">{value}</p>
      <p className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.14em] text-cream/45">{label}</p>
    </div>
  );
}
