import { useMemo } from 'react';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { CategoryCard } from '@/features/home/components/CategoryCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { scrollToSection } from '@/lib/scroll';

/**
 * Cuisine rail. Selecting a category filters the restaurant rail below (shared
 * discovery store), so the homepage works as a complete discovery surface
 * until the dedicated listing module lands.
 */
export function Categories() {
  const { categories } = useHomeData();
  const activeSlug = useDiscoveryStore((state) => state.categorySlug);
  const setCategory = useDiscoveryStore((state) => state.setCategory);
  const reset = useDiscoveryStore((state) => state.reset);

  const activeCategory = useMemo(
    () => categories.data?.find((category) => category.slug === activeSlug),
    [categories.data, activeSlug],
  );

  const selectCategory = (slug: string) => {
    setCategory(slug);
    scrollToSection('restaurants');
  };

  return (
    <section id="categories" className="section relative bg-ivory">
      <div className="shell">
        <Reveal>
          <SectionHeading
            eyebrow="Browse by appetite"
            title={
              <>
                What are you <em className="italic text-terracotta">in the mood for?</em>
              </>
            }
            description="Eight very good ways into the menu. Pick a craving and we will narrow the neighbourhood down for you."
            action={
              activeCategory ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-900/15 bg-cream px-4 py-2.5 text-[0.75rem] font-medium text-olive-700 transition hover:border-olive-900/30 hover:bg-white"
                >
                  <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear “{activeCategory.name}”
                </button>
              ) : (
                <p className="inline-flex items-center gap-2 text-[0.75rem] text-olive-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                  Curated for Brooklyn, NY
                </p>
              )
            }
          />
        </Reveal>

        {categories.isLoading ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-8 lg:gap-x-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <Skeleton className="aspect-[3/4] w-full rounded-t-[999px] rounded-b-[1rem]" />
                <Skeleton className="mt-4 h-4 w-16" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState
            className="mt-10"
            title="The categories did not load"
            description="This is a demo data source. Try again, or explore the full restaurant rail below."
            action={
              <Button variant="outline" size="sm" onClick={() => categories.refetch()}>
                Try again
              </Button>
            }
          />
        ) : !categories.data?.length ? (
          <EmptyState className="mt-10" title="No categories yet" description="The kitchen is still plating this section." />
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-8 lg:gap-x-4">
            {categories.data.map((category, index) => (
              <Reveal key={category.id} delay={Math.min(index * 45, 315)}>
                <CategoryCard
                  category={category}
                  active={category.slug === activeSlug}
                  onSelect={selectCategory}
                />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col gap-3 border-t border-olive-900/10 pt-5 text-[0.75rem] text-olive-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Select a category to filter the restaurants below. Select it again to see everything.</p>
            <button
              type="button"
              onClick={() => scrollToSection('restaurants')}
              className="link-underline self-start text-olive-700 sm:self-auto"
            >
              Jump to the restaurants
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
