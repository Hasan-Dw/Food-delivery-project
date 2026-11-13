import { useState, type ImgHTMLAttributes } from 'react';
import {
  getImage,
  imageAlt,
  imageSrcSet,
  imageUrl,
  isRemoteImage,
} from '@/config/images';
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
 * - Centralised asset manifest and alt text for bundled art
 * - Pass-through (with Cloudinary sizing) for uploaded images
 * - Responsive WebP `srcset` for bundled art
 * - Local fallback if a file is ever missing or fails to load
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
  const remote = isRemoteImage(imageKey);
  const asset = remote ? undefined : getImage(imageKey);

  if ((!remote && !asset) || failed) {
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

  // Uploaded images are already sized by the CDN; a manifest key is not.
  const srcWidth = 1200;

  return (
    <img
      {...props}
      src={imageUrl(imageKey, remote ? srcWidth : undefined)}
      srcSet={remote ? undefined : imageSrcSet(imageKey)}
      sizes={sizes}
      alt={alt ?? asset?.alt ?? 'Food from a Savora restaurant'}
      width={asset?.masterWidth ?? 1200}
      height={asset?.masterHeight ?? 900}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', imageClassName, className)}
      style={{ backgroundColor: '#EDE5D7', ...props.style }}
    />
  );
}
