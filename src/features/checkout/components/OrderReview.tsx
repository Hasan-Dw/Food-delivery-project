import { Image } from '@/components/ui/Image';
import { formatCurrency } from '@/lib/format';
import type { CartItem } from '@/types';

export function OrderReview({
  restaurantName,
  items,
}: {
  restaurantName: string;
  items: CartItem[];
}) {
  return (
    <section className="rounded-2xl border border-olive-900/10 bg-white/70 p-5 shadow-soft sm:p-7">
      <div className="mb-5">
        <p className="eyebrow text-terracotta-700">02 · Fresh from</p>
        <h2 className="mt-2 font-display text-[1.65rem] text-olive-900">{restaurantName}</h2>
      </div>
      <ul className="divide-y divide-olive-900/10">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <Image
              imageKey={item.imageKey}
              alt={item.name}
              className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-olive-900">{item.name}</h3>
                  <p className="mt-1 text-xs text-olive-500">Qty {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-olive-900">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </div>
              {item.selectedOptions.length ? (
                <p className="mt-1 text-xs leading-5 text-olive-500">
                  {item.selectedOptions.map((option) => option.optionName).join(' · ')}
                </p>
              ) : null}
              {item.notes ? <p className="mt-1 text-xs italic text-olive-500">“{item.notes}”</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
