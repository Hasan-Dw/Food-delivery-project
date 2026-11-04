import { ArrowRight, ArrowUpRight, Check, Star } from 'lucide-react';
import { Image } from '@/components/ui/Image';
import { Avatar } from '@/components/ui/Avatar';
import { useHeroAnimation } from '@/hooks/useHeroAnimation';
import { useSelectedArea } from '@/stores/location-store';
import { scrollToSection } from '@/lib/scroll';
import { site } from '@/config/site';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

const cuisines = [
  'Sushi counters',
  'Wood-fired pizza',
  'Smash burgers',
  'Handmade pasta',
  'Green bowls',
  'Ramen',
  'Pastries',
  'Tacos',
];

export function Hero() {
  const ref = useHeroAnimation<HTMLElement>();
  const area = useSelectedArea();

  return (
    <section ref={ref} id="search" className="surface-grain relative overflow-hidden bg-ivory">
      {/* Warm atmosphere, drawn with CSS rather than video. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_78%_18%,rgba(214,170,112,0.22),transparent_62%),radial-gradient(70%_50%_at_8%_88%,rgba(198,93,59,0.08),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-24 h-[30rem] w-[30rem] rounded-full border border-olive-900/[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-40 h-[22rem] w-[22rem] rounded-full border border-olive-900/[0.05]"
      />

      <div className="shell relative grid items-center gap-12 pb-12 pt-10 sm:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:pb-20 lg:pt-16">
        <div className="relative z-10 max-w-2xl">
          <p data-hero-reveal className="eyebrow text-terracotta-600">
            Independent kitchens · {area.city} &amp; beyond
          </p>

          <h1 data-hero-reveal className="mt-5 text-display-xl text-olive-900">
            Good food.
            <span className="mt-1 block italic text-terracotta-600">Delivered with care.</span>
          </h1>

          <p data-hero-reveal className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-olive-500 sm:text-base">
            Discover exceptional food from restaurants around you, and enjoy every moment from order to doorstep.
          </p>

          <div data-hero-reveal className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollToSection('restaurants')}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-olive-700 px-5 text-[0.8125rem] font-medium text-cream shadow-soft transition hover:bg-olive-800 hover:shadow-lift"
            >
              Explore restaurants
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="link-underline px-1 text-olive-700"
            >
              How it works
              <ArrowDownIcon />
            </button>
          </div>

          <div data-hero-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center">
              <Avatar name="Maya" imageKey="avatar-diner-1" size="sm" ring className="relative z-30" />
              <Avatar name="Sam" imageKey="avatar-diner-2" size="sm" ring className="-ml-2.5 relative z-20" />
              <Avatar name="Nina" imageKey="avatar-diner-3" size="sm" ring className="-ml-2.5 relative z-10" />
              <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-olive-700 text-[0.625rem] font-semibold text-cream ring-2 ring-ivory">
                48k
              </span>
            </div>

            <div className="text-[0.75rem] leading-snug">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} aria-hidden="true" className="h-3 w-3 fill-gold-300 text-gold-500" />
                ))}
                <span className="ml-1 font-semibold text-olive-800">{site.stats.averageRating}</span>
              </div>
              <p className="mt-1 text-olive-500">from 12,480 neighbourhood diners</p>
            </div>

            <div className="hidden h-8 w-px bg-olive-900/10 sm:block" aria-hidden="true" />
            <p className="inline-flex items-center gap-2 text-[0.75rem] text-olive-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive-700/10 text-olive-700">
                <Check aria-hidden="true" className="h-3 w-3" />
              </span>
              No subscription · No hidden fees
            </p>
          </div>
        </div>

        {/* Editorial image composition */}
        <div className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute right-6 top-4 hidden h-[85%] w-[78%] rounded-t-full border border-gold-300/40 sm:block"
          />

          <div
            data-hero-image
            className="arch-frame relative ml-auto aspect-[4/5] w-[88%] max-h-[36rem] overflow-hidden border-[5px] border-cream bg-ivory-200 shadow-lift sm:w-[82%]"
          >
            <Image
              imageKey="hero-dining-table"
              priority
              sizes="(min-width: 1024px) 42vw, 88vw"
              className="h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-olive-900/55 via-olive-900/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-6">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-cream/70">
                Tonight&apos;s table
              </p>
              <p className="mt-2 max-w-[16rem] font-display text-[1.4rem] leading-snug">
                Seven plates, one very good evening.
              </p>
            </div>
          </div>

          <div
            data-hero-chip
            className="absolute -left-2 top-12 flex items-center gap-2.5 rounded-2xl border border-olive-900/8 bg-cream/95 p-3 shadow-lift backdrop-blur sm:left-0"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-gold-700">
              <Star aria-hidden="true" className="h-4 w-4 fill-gold-400 text-gold-500" />
            </span>
            <div className="pr-1">
              <p className="text-[0.75rem] font-semibold leading-tight text-olive-900">4.9 average</p>
              <p className="text-[0.625rem] text-olive-500">across 240+ kitchens</p>
            </div>
          </div>

          <div
            data-hero-chip
            className="absolute -left-3 bottom-28 hidden w-[15.5rem] rounded-2xl bg-olive-800 p-4 text-cream shadow-lift sm:block lg:-left-8"
            aria-hidden="true"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative">
                <Avatar name="Daniel" imageKey="avatar-driver" size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-olive-800 bg-[#7FA86B]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.75rem] font-medium">Daniel is on the way</p>
                <p className="text-[0.625rem] text-cream/55">Kōji Sushi · 2.4 km</p>
              </div>
            </div>
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[0.625rem]">
                <span className="text-cream/55">Arriving in</span>
                <span className="font-semibold text-gold-200">14 min</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream/15">
                <div className="h-full w-[62%] rounded-full bg-gold-300" />
              </div>
            </div>
          </div>

          <Link
            to={ROUTES.orderTracking('ord_10482')}
            data-hero-chip
            className="absolute bottom-6 right-2 hidden items-center gap-1.5 rounded-full border border-olive-900/10 bg-cream/95 px-3.5 py-2 text-[0.6875rem] font-medium text-olive-700 shadow-soft backdrop-blur transition hover:bg-cream sm:inline-flex"
          >
            Follow a delivery
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="relative border-y border-olive-900/10 bg-cream/55 py-3.5">
        <div className="flex w-max animate-marquee gap-0 whitespace-nowrap hover:[animation-play-state:paused]">
          {[0, 1].map((pass) => (
            <div key={pass} className="flex items-center" aria-hidden={pass === 1}>
              {cuisines.map((cuisine) => (
                <span
                  key={`${pass}-${cuisine}`}
                  className="flex items-center gap-6 px-6 text-[0.625rem] font-medium uppercase tracking-[0.22em] text-olive-500"
                >
                  {cuisine}
                  <span className="h-1 w-1 rounded-full bg-gold-400/70" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v10M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
