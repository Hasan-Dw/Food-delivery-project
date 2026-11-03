import type { RestaurantCategory } from '@/types';
import { Image } from '@/components/ui/Image';
import { cn } from '@/lib/cn';

interface CategoryCardProps {
  category: RestaurantCategory;
  active?: boolean;
  onSelect: (slug: string) => void;
}

export function CategoryCard({ category, active = false, onSelect }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.slug)}
      aria-pressed={active}
      className="group flex w-full flex-col items-center text-center focus-visible:outline-offset-8"
    >
      <span
        className={cn(
          'relative block aspect-[3/4] w-full overflow-hidden rounded-t-[999px] rounded-b-[1rem] bg-ivory-200 transition-all duration-500 ease-out-soft',
          active
            ? 'ring-2 ring-terracotta ring-offset-4 ring-offset-ivory'
            : 'group-hover:ring-2 group-hover:ring-olive-900/20 group-hover:ring-offset-4 group-hover:ring-offset-ivory',
        )}
      >
        <Image
          imageKey={category.imageKey}
          sizes="(min-width: 1024px) 12vw, 130px"
          imageClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-olive-900/45 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
        <span
          className={cn(
            'absolute inset-x-3 bottom-3 rounded-full px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] backdrop-blur transition-colors',
            active ? 'bg-terracotta-600 text-cream' : 'bg-cream/85 text-olive-700',
          )}
        >
          {category.itemCount} places
        </span>
      </span>

      <span
        className={cn(
          'mt-3.5 font-display text-[1.05rem] leading-tight transition-colors duration-300',
          active ? 'text-terracotta-600' : 'text-olive-900 group-hover:text-terracotta-600',
        )}
      >
        {category.name}
      </span>
      <span className="mt-1 line-clamp-1 text-[0.6875rem] text-olive-500">{category.description}</span>
    </button>
  );
}
