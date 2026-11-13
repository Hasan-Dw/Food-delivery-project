import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const ALLOWED_MIME: SupportedImageMime[] = ['image/jpeg', 'image/png', 'image/webp'];

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function isJpeg(buffer: Buffer): boolean {
  return startsWith(buffer, [0xff, 0xd8, 0xff]);
}

function isPng(buffer: Buffer): boolean {
  return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

/** RIFF container with a WEBP fourCC at byte 8. */
function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

export interface ValidatedImage {
  mime: SupportedImageMime;
  extension: string;
  bytes: number;
}

/**
 * Minimal shape of a multer memory-stored file. Declared locally so the
 * project does not depend on global Express namespace augmentation.
 */
export interface UploadedImageFile {
  buffer: Buffer;
  size: number;
  mimetype?: string;
  originalname?: string;
}

/**
 * Validates an uploaded image from its bytes, never from the client-supplied
 * extension or MIME header. A file must be a real JPEG, PNG or WebP.
 */
export function validateImageFile(file?: UploadedImageFile): ValidatedImage {
  if (!file || !file.buffer?.length) {
    throw new BadRequestException({
      code: 'image_required',
      message: 'Attach an image file in the "image" field.',
    });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new PayloadTooLargeException({
      code: 'image_too_large',
      message: 'Images must be 5 MB or smaller.',
    });
  }

  if (file.mimetype && !ALLOWED_MIME.includes(file.mimetype as SupportedImageMime)) {
    throw new BadRequestException({
      code: 'unsupported_image_type',
      message: 'Only JPEG, PNG or WebP images are accepted.',
    });
  }

  if (isJpeg(file.buffer)) {
    return { mime: 'image/jpeg', extension: 'jpg', bytes: file.size };
  }
  if (isPng(file.buffer)) {
    return { mime: 'image/png', extension: 'png', bytes: file.size };
  }
  if (isWebp(file.buffer)) {
    return { mime: 'image/webp', extension: 'webp', bytes: file.size };
  }

  throw new BadRequestException({
    code: 'invalid_image_file',
    message: 'The uploaded file is not a valid JPEG, PNG or WebP image.',
  });
}
