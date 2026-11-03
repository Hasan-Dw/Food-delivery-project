import { Compass, MapPin, ShoppingBag } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { scrollToSection } from '@/lib/scroll';

const steps = [
  {
    icon: Compass,
    title: 'Find your place',
    description:
      'Browse by cuisine or search for the dish you already know you want. Every kitchen is independent, visited and vetted.',
  },
  {
    icon: ShoppingBag,
    title: 'Order in a few taps',
    description:
      'Clear prices, delivery fees and allergens before you confirm. No subscription, no surprise charges at the door.',
  },
  {
    icon: MapPin,
    title: 'Follow it home',
    description:
      'Watch the kitchen, the driver and the route. An honest ETA, not a countdown that quietly resets itself.',
  },
];

/** Three-step explainer, with a working path into the demo tracking page. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section border-y border-olive-900/8 bg-cream">
      <div className="shell">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="How Savora works"
            title={
              <>
                From “what sounds good?” to <em className="italic text-terracotta">“that was excellent.”</em>
              </>
            }
            description="A marketplace built around the whole evening, not just the transaction. Three steps, no subscription, no small print."
          />
        </Reveal>

        <div className="mt-12 overflow-hidden rounded-panel border border-olive-900/10 bg-ivory">
          <div className="grid lg:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <Reveal
                key={title}
                delay={index * 80}
                className={index > 0 ? 'border-t border-olive-900/10 lg:border-l lg:border-t-0' : undefined}
              >
                <div className="flex h-full flex-col p-7 sm:p-9">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-olive-700 ring-1 ring-inset ring-olive-900/10">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="font-display text-[2.5rem] leading-none text-olive-900/15">0{index + 1}</span>
                  </div>

                  <h3 className="mt-7 font-display text-[1.5rem] leading-tight text-olive-900">{title}</h3>
                  <p className="mt-2.5 max-w-sm text-[0.875rem] leading-relaxed text-olive-500">{description}</p>

                  {index === 2 ? (
                    <ButtonLink
                      to={ROUTES.orderTracking('ord_10482')}
                      variant="outline"
                      size="sm"
                      className="mt-6 self-start"
                    >
                      See a delivery in progress
                    </ButtonLink>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-olive-900/10 bg-ivory-200/40 px-7 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <p className="text-[0.75rem] leading-relaxed text-olive-500">
              <span className="font-medium text-olive-700">No subscription. No hidden fees.</span> Delivered by locals,
              paid fairly, packed with care.
            </p>
            <button
              type="button"
              onClick={() => scrollToSection('restaurants')}
              className="link-underline self-start text-olive-700 sm:self-auto"
            >
              Find something good
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
