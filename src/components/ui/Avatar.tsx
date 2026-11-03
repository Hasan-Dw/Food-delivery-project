import { cn } from '@/lib/cn';
import { imageUrl } from '@/config/images';
import { initials } from '@/lib/format';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[0.625rem]',
  sm: 'h-9 w-9 text-[0.6875rem]',
  md: 'h-11 w-11 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-24 w-24 text-xl',
};

interface AvatarProps {
  name: string;
  imageKey?: string | null;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, imageKey, size = 'md', className, ring = false }: AvatarProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-olive-700 font-semibold uppercase tracking-wide text-cream',
        sizes[size],
        ring && 'ring-2 ring-cream ring-offset-2 ring-offset-ivory',
        className,
      )}
      aria-hidden={imageKey ? undefined : true}
    >
      {imageKey ? (
        <img
          src={imageUrl(imageKey, 320)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
