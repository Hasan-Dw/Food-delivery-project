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

export type ImageKey = string;

export function getImage(key: ImageKey): ImageAsset | undefined {
  return byKey.get(key);
}

export function imageUrl(key: ImageKey, width?: number): string {
  const asset = byKey.get(key);
  if (!asset) return '/assets/placeholder-food.svg';
  const w = width && asset.widths.includes(width) ? width : asset.widths[asset.widths.length - 1];
  return `/assets/${asset.folder}/${key}-${w}.webp`;
}

export function imageSrcSet(key: ImageKey): string {
  const asset = byKey.get(key);
  if (!asset) return '';
  return asset.widths.map((w) => `/assets/${asset.folder}/${key}-${w}.webp ${w}w`).join(', ');
}

export function imageAlt(key: ImageKey, fallback = 'Food from a Savora restaurant'): string {
  return byKey.get(key)?.alt ?? fallback;
}

export function imageAspect(key: ImageKey): number {
  const asset = byKey.get(key);
  if (!asset) return 4 / 3;
  return asset.ratio[0] / asset.ratio[1];
}

export { assets as imageManifest };
