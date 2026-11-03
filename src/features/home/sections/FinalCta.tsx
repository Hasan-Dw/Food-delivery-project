import { ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { Image } from '@/components/ui/Image';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSelectedArea } from '@/stores/location-store';
import { ROUTES } from '@/config/routes';
import { scrollToSection } from '@/lib/scroll';

/** Closing invitation. The image carries the mood; the copy stays short. */
export function FinalCta() {
  const area = useSelectedArea();
  const { isAuthenticated } = useAuth();

  return (
    <section className="surface-grain relative overflow-hidden bg-olive-900 text-cream">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[47%]">
        <Image
          imageKey="editorial-table"
          sizes="(min-width: 1024px) 47vw, 100vw"
          className="h-full w-full"
          imageClassName="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-olive-900 via-olive-900/75 to-olive-900/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-olive-900/70 via-transparent to-olive-900/20" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-cream/8"
      />

      <div className="shell relative z-10 py-20 lg:py-28">
        <div className="max-w-xl">
          <Reveal>
            <p className="eyebrow text-gold-200">Your table is waiting</p>
            <h2 className="mt-5 text-display-lg text-cream">
              The best food in your neighbourhood is <em className="italic text-gold-200">one order away.</em>
            </h2>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-cream/60">
              Independent kitchens, cooked to order and delivered with care. No subscription. No hidden fees. Just
              dinner, handled properly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="gold"
                size="lg"
                onClick={() => scrollToSection('restaurants')}
                iconRight={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Find something good
              </Button>
              <ButtonLink
                to={isAuthenticated ? ROUTES.profile : ROUTES.register}
                variant="light"
                size="lg"
              >
                {isAuthenticated ? 'View your profile' : 'Create an account'}
              </ButtonLink>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.75rem] text-cream/55">
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-gold-300" />
                Delivering to {area.city}, {area.region} {area.postalCode}
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-gold-300" />
                240+ independent kitchens
              </span>
            </div>

            <p className="mt-8 border-t border-cream/12 pt-5 text-[0.6875rem] leading-relaxed text-cream/35">
              Savora is a frontend prototype. Orders, payments and live delivery data are simulated, and no real
              transaction is ever created.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
