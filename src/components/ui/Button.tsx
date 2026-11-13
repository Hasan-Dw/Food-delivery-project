import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'light'
  | 'gold'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-terracotta-600 text-cream shadow-soft hover:bg-terracotta-700 hover:shadow-lift active:bg-terracotta-800',
  secondary:
    'bg-olive text-cream shadow-soft hover:bg-olive-800 hover:shadow-lift active:bg-olive-900',
  outline:
    'border border-olive-900/20 bg-transparent text-olive-800 hover:border-olive-900/40 hover:bg-olive-900/[0.04]',
  ghost: 'bg-transparent text-olive-800 hover:bg-olive-900/[0.06]',
  light: 'bg-cream text-olive-900 shadow-soft hover:bg-white hover:shadow-lift',
  gold: 'bg-gold-300 text-olive-900 shadow-soft hover:bg-gold-200 hover:shadow-lift',
  danger: 'bg-danger text-cream hover:bg-danger/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-4 text-[0.8125rem]',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-[3.25rem] gap-2.5 px-7 text-[0.9375rem]',
  icon: 'h-10 w-10 p-0',
};

const base =
  'inline-flex select-none items-center justify-center rounded-full font-medium tracking-[-0.01em] transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-out-soft focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-55';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        iconLeft
      )}
      {children}
      {!isLoading && iconRight}
    </button>
  );
});

export interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to?: string;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function ButtonLink({
  to,
  href,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
  const content = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...props}>
      {content}
    </a>
  );
}
