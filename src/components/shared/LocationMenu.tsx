import { useState, useRef } from 'react';
import { Check, ChevronDown, MapPin, Navigation } from 'lucide-react';
import { serviceAreas, useLocationStore, useSelectedArea } from '@/stores/location-store';
import { useDismissible } from '@/hooks/useDismissible';
import { cn } from '@/lib/cn';

interface LocationMenuProps {
  tone?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
}

/** Delivery-area selector. Areas are service-level config, not mock API data. */
export function LocationMenu({ tone = 'dark', compact = false, className }: LocationMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const area = useSelectedArea();
  const setArea = useLocationStore((state) => state.setArea);
  useDismissible(open, () => setOpen(false), ref);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'group inline-flex items-center gap-2 rounded-full text-left transition-colors',
          compact ? 'px-2 py-1.5' : 'border px-3.5 py-2',
          tone === 'light'
            ? 'border-cream/25 text-cream hover:bg-cream/10'
            : 'border-olive-900/12 bg-cream/70 text-olive-700 hover:border-olive-900/25 hover:bg-cream',
          className,
        )}
      >
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-terracotta" />
        <span className="min-w-0">
          <span className={cn('block text-[0.625rem] uppercase tracking-[0.12em]', tone === 'light' ? 'text-cream/55' : 'text-olive-500')}>
            Delivering to
          </span>
          <span className="block truncate text-[0.8125rem] font-medium leading-tight">
            {area.city}, {area.region} {area.postalCode}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Delivery area"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[17rem] animate-fade-up overflow-hidden rounded-2xl border border-olive-900/10 bg-cream p-2 shadow-lift"
        >
          <p className="px-3 pb-2 pt-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-olive-500">
            Choose your area
          </p>
          {serviceAreas.map((option) => {
            const selected = option.id === area.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setArea(option.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  selected ? 'bg-olive-700 text-cream' : 'text-olive-700 hover:bg-olive-900/5',
                )}
              >
                <span>
                  <span className="block text-[0.8125rem] font-medium">
                    {option.city}, {option.region}
                  </span>
                  <span className={cn('block text-[0.6875rem]', selected ? 'text-cream/60' : 'text-olive-500')}>
                    {option.eta} · {option.postalCode}
                  </span>
                </span>
                {selected ? <Check aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-olive-900/8 px-3 pb-1 pt-3 text-[0.6875rem] text-olive-500">
            <Navigation aria-hidden="true" className="h-3.5 w-3.5 text-terracotta" />
            Demo area selector — no location permission requested.
          </div>
        </div>
      ) : null}
    </div>
  );
}
