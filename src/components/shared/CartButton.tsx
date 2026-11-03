import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { selectCartCount, useCartStore } from '@/stores/cart-store';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';

export function CartButton({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const count = useCartStore(selectCartCount);

  return (
    <Link
      to={ROUTES.cart}
      aria-label={count > 0 ? `Cart, ${count} items` : 'Cart, empty'}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-full transition',
        tone === 'light'
          ? 'text-cream hover:bg-cream/10'
          : 'border border-olive-900/12 bg-cream/70 text-olive-800 hover:border-olive-900/25 hover:bg-cream',
        className,
      )}
    >
      <ShoppingBag aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-600 px-1 text-[0.625rem] font-semibold leading-none text-cream ring-2 ring-ivory">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}
