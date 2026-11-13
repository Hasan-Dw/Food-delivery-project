import { Injectable } from '@nestjs/common';
import { CloudinaryService, type StoredImage } from './cloudinary.service';
import { validateImageFile, type UploadedImageFile, type ValidatedImage } from './image-file.util';

export interface ImageUploadTarget {
  /** Folder relative to the Cloudinary root, e.g. `users/user-123`. */
  folder: string;
  /** File stem, e.g. `profile` or `cover`. */
  name: string;
}

export interface UploadedImage extends StoredImage {
  mime: string;
}

/**
 * Validates image bytes and stores them through Cloudinary.
 *
 * The public id includes a millisecond timestamp so a replacement never
 * overwrites the asset the database is still serving. The caller updates
 * MongoDB first and deletes the previous asset afterwards.
 */
@Injectable()
export class UploadsService {
  constructor(private readonly cloudinary: CloudinaryService) {}

  get enabled(): boolean {
    return this.cloudinary.enabled;
  }

  async store(
    file: UploadedImageFile | undefined,
    target: ImageUploadTarget,
  ): Promise<UploadedImage> {
    const validated: ValidatedImage = validateImageFile(file);
    const publicId = `${this.cloudinary.rootFolder}/${target.folder}/${target.name}-${Date.now()}`;

    const stored = await this.cloudinary.upload(file!.buffer, {
      publicId,
      mime: validated.mime,
      extension: validated.extension,
    });

    return { ...stored, mime: validated.mime };
  }

  /** Deletes a replaced or removed asset. Never throws. */
  async discard(publicId?: string | null): Promise<void> {
    await this.cloudinary.destroy(publicId);
  }

  /** Folder-safe representation of a database id. */
  safeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
