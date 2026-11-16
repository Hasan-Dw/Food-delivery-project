import manifest from './image-manifest.json';

export interface ImageAsset {
  key: string;
  folder: string;
  ratio: [number, number];
  widths: number[];
  masterWidth: number;
  masterHeight: number;
  alt: string;
  credit: string;
}

const assets = manifest as ImageAsset[];
const byKey = new Map(assets.map((asset) => [asset.key, asset]));

/**
 * Legacy/seed identifiers that predate the manifest. They resolve to checked-in
 * artwork rather than a broken image, so records created before the manifest
 * was finalised keep rendering. New seeds use explicit, descriptive keys.
 */
const fallbackKeys: Record<string, string> = {
  'restaurant-default': 'restaurant-nonna-lucia',
  'dish-default': 'dish-chicken-sandwich',
  'product-default': 'dish-chicken-sandwich',
};

function resolveKey(key: ImageKey): ImageKey {
  return fallbackKeys[key] ?? key;
}

export type ImageKey = string;

/**
 * Uploaded images (Cloudinary) are stored as absolute URLs, while bundled
 * artwork is addressed by a manifest key. Every helper accepts either form so
 * call sites do not need to know where an image came from.
 */
export function isRemoteImage(key: ImageKey | null | undefined): key is string {
  return typeof key === 'string' && /^https?:\/\//i.test(key.trim());
}

/**
 * Adds Cloudinary delivery transforms (`f_auto`, `q_auto`, width cap) without
 * touching already-transformed URLs or non-Cloudinary hosts.
 */
export function optimizedImageUrl(url: string, width?: number): string {
  if (!isRemoteImage(url) || !width) return url;
  const marker = '/image/upload/';
  if (!url.includes(marker) || url.includes('/image/upload/f_auto')) return url;
  return url.replace(marker, `${marker}f_auto,q_auto,w_${width},c_fill/`);
}

export function getImage(key: ImageKey): ImageAsset | undefined {
  if (isRemoteImage(key)) return undefined;
  return byKey.get(resolveKey(key));
}

export function imageUrl(key: ImageKey, width?: number): string {
  if (isRemoteImage(key)) {
    // Remote images have no manifest widths; request the caller's size, falling
    // back to a sensible card-sized default.
    return optimizedImageUrl(key, width ?? 800);
  }
  const resolved = resolveKey(key);
  const asset = byKey.get(resolved);
  if (!asset) return '/assets/placeholder-food.svg';
  const w = width && asset.widths.includes(width) ? width : asset.widths[asset.widths.length - 1];
  return `/assets/${asset.folder}/${resolved}-${w}.webp`;
}

export function imageSrcSet(key: ImageKey): string {
  if (isRemoteImage(key)) return '';
  const resolved = resolveKey(key);
  const asset = byKey.get(resolved);
  if (!asset) return '';
  return asset.widths.map((w) => `/assets/${asset.folder}/${resolved}-${w}.webp ${w}w`).join(', ');
}

export function imageAlt(key: ImageKey, fallback = 'Food from a Savora restaurant'): string {
  return byKey.get(resolveKey(key))?.alt ?? fallback;
}

export function imageAspect(key: ImageKey): number {
  if (isRemoteImage(key)) return 4 / 3;
  const asset = byKey.get(resolveKey(key));
  if (!asset) return 4 / 3;
  return asset.ratio[0] / asset.ratio[1];
}

export { assets as imageManifest };
