import { MapPin } from 'lucide-react';
import { useSelectedArea } from '@/stores/location-store';
import { cn } from '@/lib/cn';

interface LocationMenuProps {
  tone?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
}

/**
 * Delivery city indicator. Savora delivers across Latakia only, so there is no
 * neighbourhood picker: the header shows the city and the internal area id is
 * kept for distance, routing and assignment calculations.
 */
export function LocationMenu({ tone = 'dark', compact = false, className }: LocationMenuProps) {
  const area = useSelectedArea();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full text-left',
        compact ? 'px-2 py-1.5' : 'border px-3.5 py-2',
        tone === 'light'
          ? 'border-cream/25 text-cream'
          : 'border-olive-900/12 bg-cream/70 text-olive-700',
        className,
      )}
    >
      <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-terracotta" />
      <span className="min-w-0">
        <span
          className={cn(
            'block text-[0.625rem] uppercase tracking-[0.12em]',
            tone === 'light' ? 'text-cream/55' : 'text-olive-500',
          )}
        >
          Delivering to
        </span>
        <span className="block truncate text-[0.8125rem] font-medium leading-tight">{area.city}</span>
      </span>
    </div>
  );
}
