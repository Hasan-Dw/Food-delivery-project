import { ArrowUpRight, Headset, MapPinned, ShieldCheck } from 'lucide-react';
import { Image } from '@/components/ui/Image';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { useParallax } from '@/hooks/useHeroAnimation';
import { ROUTES } from '@/config/routes';
import { scrollToSection } from '@/lib/scroll';

const features = [
  {
    icon: MapPinned,
    title: 'A route, not a progress bar',
    description:
      'The tracking page is built around the delivery itself: restaurant, driver, route and the door it is heading to.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest handoffs',
    description:
      'Leave it at the door, meet the driver, or add a note. Sealed packaging and clear instructions come standard.',
  },
  {
    icon: Headset,
    title: 'People, not ticket numbers',
    description:
      'If something is wrong with dinner, a human answers. Every day, from 8am to 11pm.',
  },
];

/**
 * Cinematic delivery story, built from real photography and CSS light rather
 * than video. The map teaser is deliberately labelled as a demo route.
 */
export function DeliveryExperience() {
  const parallaxRef = useParallax<HTMLDivElement>(8);

  return (
    <section id="delivery" className="section relative overflow-hidden bg-ivory">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 bottom-10 h-[26rem] w-[26rem] rounded-full border border-olive-900/6"
      />

      <div className="shell relative grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20">
        <Reveal>
          <div className="relative mx-auto w-full max-w-[32rem] lg:mx-0">
            <div ref={parallaxRef} className="arch-frame relative aspect-[4/5] overflow-hidden border-[5px] border-cream bg-ivory-200 shadow-lift">
              <Image
                imageKey="delivery-courier"
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-olive-900/55 via-olive-900/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-cream/70">
                  Doorstep, 7:42pm
                </p>
                <p className="mt-2 max-w-[17rem] font-display text-[1.55rem] leading-snug text-cream">
                  Still warm. Still yours.
                </p>
              </div>
            </div>

            <div className="absolute -right-3 top-8 hidden w-[15rem] overflow-hidden rounded-2xl border-[4px] border-cream shadow-lift sm:block lg:-right-10">
              <div className="aspect-[4/3]">
                <Image imageKey="kitchen-craft" sizes="240px" className="h-full w-full" />
              </div>
            </div>

            <div className="absolute -bottom-7 left-0 w-[17.5rem] rounded-2xl border border-olive-900/10 bg-cream/95 p-4 shadow-lift backdrop-blur lg:-left-8">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="gold" size="sm">
                  Demo route
                </Badge>
                <span className="text-[0.625rem] text-olive-500">Illustrative</span>
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar name="Daniel" imageKey="avatar-driver" size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[0.75rem] font-semibold text-olive-900">Daniel · Kōji Sushi</p>
                  <p className="text-[0.625rem] text-olive-500">2.4 km · 14 min away</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-olive-900/10">
                <div className="h-full w-[58%] rounded-full bg-terracotta" />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <p className="eyebrow text-terracotta-600">From kitchen to doorstep</p>
          <h2 className="mt-5 text-display-md">
            Dinner is a journey.
            <span className="mt-1 block italic text-terracotta">You can watch every step.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-olive-500">
            Follow your order from the pass to your door — the restaurant, the driver and the road in between. The
            tracking experience is designed for real maps and live driver updates, and this prototype is clear about
            what is simulated.
          </p>

          <ul className="mt-8 space-y-5">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive-700/8 text-olive-700 ring-1 ring-inset ring-olive-900/8">
                  <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <div>
                  <h3 className="font-display text-[1.15rem] leading-snug text-olive-900">{title}</h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-olive-500">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              to={ROUTES.orderTracking('ord_10482')}
              iconRight={<ArrowUpRight aria-hidden="true" className="h-4 w-4" />}
            >
              Follow a demo delivery
            </ButtonLink>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="link-underline self-start px-1 text-olive-700 sm:self-auto"
            >
              How tracking works
            </button>
          </div>

          <p className="mt-5 text-[0.6875rem] leading-relaxed text-olive-500">
            The order page map is a hand-drawn illustration of the final experience, clearly labelled demo mode. No
            GPS permission is requested and no location is tracked.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
