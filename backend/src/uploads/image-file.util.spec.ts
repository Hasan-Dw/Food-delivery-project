import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  MAX_IMAGE_BYTES,
  validateImageFile,
  type UploadedImageFile,
} from './image-file.util';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.from([0x56, 0x50, 0x38, 0x20]),
]);

function file(buffer: Buffer, mimetype = 'image/jpeg'): UploadedImageFile {
  return { buffer, size: buffer.length, mimetype, originalname: 'upload' };
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    const response = (error as { getResponse?: () => unknown }).getResponse?.();
    return String((response as { code?: string })?.code ?? '');
  }
  return 'no-error';
}

describe('validateImageFile', () => {
  it('accepts real JPEG, PNG and WebP bytes', () => {
    expect(validateImageFile(file(JPEG))).toMatchObject({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
    expect(validateImageFile(file(PNG, 'image/png'))).toMatchObject({
      mime: 'image/png',
      extension: 'png',
    });
    expect(validateImageFile(file(WEBP, 'image/webp'))).toMatchObject({
      mime: 'image/webp',
      extension: 'webp',
    });
  });

  it('trusts the bytes over a mislabelled MIME header', () => {
    // A PNG announced as a JPEG is still stored as a PNG.
    expect(validateImageFile(file(PNG, 'image/jpeg'))).toMatchObject({
      mime: 'image/png',
      extension: 'png',
    });
  });

  it('rejects a missing file and an unsupported MIME type', () => {
    expect(() => validateImageFile(undefined)).toThrow(BadRequestException);
    expect(codeOf(() => validateImageFile(undefined))).toBe('image_required');

    const text = Buffer.from('hello world');
    expect(codeOf(() => validateImageFile(file(text, 'text/plain')))).toBe(
      'unsupported_image_type',
    );
  });

  it('rejects a file whose bytes are not a supported image', () => {
    const fake = Buffer.from('not an image at all');
    expect(codeOf(() => validateImageFile(file(fake, 'image/jpeg')))).toBe(
      'invalid_image_file',
    );
  });

  it('rejects files above the 5 MB limit', () => {
    const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1);
    expect(() => validateImageFile(file(oversized))).toThrow(
      PayloadTooLargeException,
    );
    expect(codeOf(() => validateImageFile(file(oversized)))).toBe(
      'image_too_large',
    );
  });
});
