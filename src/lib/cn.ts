import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names without style collisions. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
