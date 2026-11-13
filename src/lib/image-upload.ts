/** Client-side guard that mirrors the API's image rules before uploading. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface ImageValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File | null | undefined): ImageValidationResult {
  if (!file) return { ok: false, error: 'Choose an image to upload.' };

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { ok: false, error: 'Use a JPEG, PNG or WebP image.' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Images must be 5 MB or smaller.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'That file is empty. Choose another image.' };
  }

  return { ok: true };
}

export const IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');
