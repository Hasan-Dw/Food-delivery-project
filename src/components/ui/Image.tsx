import { useState, type ImgHTMLAttributes } from 'react';
import { getImage, imageAlt, imageSrcSet, imageUrl } from '@/config/images';
import { cn } from '@/lib/cn';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'alt'> {
  imageKey: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  imageClassName?: string;
}

/**
 * Single image primitive for the whole product.
 * - Centralised asset manifest and alt text
 * - Responsive WebP `srcset`
 * - Local fallback if a file is ever missing
 * - Intrinsic dimensions prevent layout shift
 */
export function Image({
  imageKey,
  alt,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority = false,
  className,
  imageClassName,
  ...props
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const asset = getImage(imageKey);

  if (!asset || failed) {
    return (
      <img
        {...props}
        src="/assets/placeholder-food.svg"
        alt={alt ?? imageAlt(imageKey)}
        className={cn('h-full w-full object-cover', imageClassName, className)}
        width={800}
        height={600}
      />
    );
  }

  return (
    <img
      {...props}
      src={imageUrl(imageKey)}
      srcSet={imageSrcSet(imageKey)}
      sizes={sizes}
      alt={alt ?? asset.alt}
      width={asset.masterWidth}
      height={asset.masterHeight}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', imageClassName, className)}
      style={{ backgroundColor: '#EDE5D7', ...props.style }}
    />
  );
}
