import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { scrollToSection } from '@/lib/scroll';
import { LocationMenu } from './LocationMenu';
import { cn } from '@/lib/cn';

interface SearchBarProps {
  className?: string;
  showSuggestions?: boolean;
}

/**
 * Marketplace search + delivery location, the hero's primary utility.
 * On submit it filters the home discovery rail and moves the user there.
 * Team Member 4 can reuse the same store to drive the full listing page.
 */
export function SearchBar({ className, showSuggestions = true }: SearchBarProps) {
  const search = useDiscoveryStore((state) => state.search);
  const setSearch = useDiscoveryStore((state) => state.setSearch);
  const setCategory = useDiscoveryStore((state) => state.setCategory);
  const [value, setValue] = useState(search);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(value.trim());
    scrollToSection('restaurants');
  };

  return (
    <div className={cn('w-full', className)}>
      <form
        role="search"
        onSubmit={submit}
        className="flex w-full flex-col gap-2 rounded-2xl border border-olive-900/10 bg-cream p-2 shadow-card sm:flex-row sm:items-center sm:rounded-full sm:p-1.5"
      >
        <div className="hidden shrink-0 sm:block">
          <LocationMenu compact className="max-w-[13rem]" />
        </div>

        <label htmlFor="savora-search" className="sr-only">
          Search restaurants or dishes
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-olive-500"
          />
          <input
            id="savora-search"
            name="search"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search restaurants or dishes"
            autoComplete="off"
            className="h-11 w-full rounded-full bg-transparent pl-10 pr-10 text-[0.875rem] text-ink placeholder:text-olive-300 focus:outline-none"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue('');
                setSearch('');
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-olive-500 transition hover:bg-olive-900/5 hover:text-olive-700"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-terracotta-600 px-5 text-[0.8125rem] font-medium text-cream shadow-soft transition hover:bg-terracotta-700 sm:px-6"
        >
          <Search aria-hidden="true" className="h-4 w-4 sm:hidden" />
          Find food
        </button>
      </form>

      {showSuggestions ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.75rem] text-olive-500">
          <span className="uppercase tracking-[0.12em] text-olive-500">Popular</span>
          {['Sushi', 'Pizza', 'Burgers', 'Healthy'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setValue(term);
                setCategory(term.toLowerCase());
                setSearch(term);
                scrollToSection('restaurants');
              }}
              className="rounded-full border border-olive-900/12 bg-cream/60 px-3 py-1.5 text-olive-600 transition hover:border-olive-900/25 hover:bg-cream hover:text-olive-900"
            >
              {term}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
