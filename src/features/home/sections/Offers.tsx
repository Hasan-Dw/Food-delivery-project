import { BadgeCheck, Info } from 'lucide-react';
import { PromoCard } from '@/features/home/components/PromoCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { useHomeData } from '@/features/home/hooks/useHomeData';

/** Promotional cards are demo-only; codes do not touch a payment provider. */
export function Offers() {
  const { promotions } = useHomeData();

  return (
    <section id="offers" className="section relative overflow-hidden border-y border-olive-900/8 bg-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-10 h-[22rem] w-[22rem] rounded-full bg-gold-100/60 blur-3xl"
      />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            eyebrow="A little something extra"
            title={
              <>
                Good food tastes better <em className="italic text-terracotta">with a good deal.</em>
              </>
            }
            description="Three current offers from kitchens in your neighbourhood. Copy a code and add it at checkout — no subscription, no hoops."
            action={
              <p className="inline-flex items-center gap-2 text-[0.75rem] text-olive-500">
                <BadgeCheck aria-hidden="true" className="h-4 w-4 text-olive-500" />
                Handpicked, not pay-to-play
              </p>
            }
          />
        </Reveal>

        {promotions.isLoading ? (
          <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-panel border border-olive-900/8 bg-cream">
                <Skeleton className="aspect-[16/9]" />
                <div className="space-y-3 p-6">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="mt-6 h-9 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : promotions.isError ? (
          <ErrorState
            className="mt-9"
            title="The offers did not load"
            description="The rest of the marketplace is unaffected. Try again in a moment."
            action={
              <Button variant="outline" size="sm" onClick={() => promotions.refetch()}>
                Try again
              </Button>
            }
          />
        ) : !promotions.data?.length ? (
          <EmptyState
            className="mt-9"
            title="No offers on the pass right now"
            description="New codes land every other Thursday. Check back soon."
          />
        ) : (
          <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promotions.data.map((promotion, index) => (
              <Reveal key={promotion.id} delay={index * 70}>
                <PromoCard promotion={promotion} />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={120}>
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-olive-900/10 bg-ivory px-5 py-4 text-[0.75rem] text-olive-500 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2.5">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
              <span>
                Demo offers only. Codes are stored locally in this prototype and never sent to a payment provider.
              </span>
            </p>
            <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.12em] text-olive-500">
              Terms apply at checkout
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
