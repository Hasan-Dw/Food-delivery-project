import { createHash } from 'node:crypto';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupportedImageMime } from './image-file.util';

export interface StoredImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: { message?: string };
}

/**
 * Minimal signed Cloudinary client.
 *
 * Only the backend holds the API secret. Requests are signed with SHA-1 over
 * the alphabetically sorted parameters exactly as Cloudinary documents, using
 * `fetch` so the project does not pull in a second HTTP stack.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folder: string;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.cloudName = config.get<string>('cloudinary.cloudName') ?? '';
    this.apiKey = config.get<string>('cloudinary.apiKey') ?? '';
    this.apiSecret = config.get<string>('cloudinary.apiSecret') ?? '';
    this.folder = config.get<string>('cloudinary.folder') ?? 'savora';
    this.enabled = Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /** Root folder for every Savora asset, e.g. `savora`. */
  get rootFolder(): string {
    return this.folder;
  }

  async upload(
    buffer: Buffer,
    options: { publicId: string; mime: SupportedImageMime; extension: string },
  ): Promise<StoredImage> {
    this.assertConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      invalidate: 'true',
      overwrite: 'true',
      public_id: options.publicId,
      timestamp: String(timestamp),
    };
    const signature = this.sign(params);

    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.append(key, value);
    form.append('api_key', this.apiKey);
    form.append('signature', signature);
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: options.mime }),
      `${options.publicId.split('/').pop() ?? 'image'}.${options.extension}`,
    );

    const response = await this.request(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      form,
    );

    if (!response.secure_url || !response.public_id) {
      throw new BadGatewayException({
        code: 'image_upload_failed',
        message: 'The image could not be stored. Please try again.',
      });
    }

    return {
      url: response.secure_url,
      publicId: response.public_id,
      width: response.width,
      height: response.height,
      bytes: response.bytes,
      format: response.format,
    };
  }

  /**
   * Best-effort delete. A missing asset is already the desired end state, so a
   * failure is logged rather than failing the user's request.
   */
  async destroy(publicId?: string | null): Promise<void> {
    if (!publicId || !this.enabled) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      invalidate: 'true',
      public_id: publicId,
      timestamp: String(timestamp),
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.append(key, value);
    form.append('api_key', this.apiKey);
    form.append('signature', this.sign(params));

    try {
      await this.request(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        form,
      );
    } catch (error) {
      this.logger.warn(
        `Could not delete Cloudinary asset ${publicId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Delivery URL with automatic format/quality and a width cap. Stored records
   * keep the plain secure URL; callers can derive a sized variant from it.
   */
  optimizedUrl(url: string, width: number): string {
    if (!this.cloudName) return url;
    const marker = `/image/upload/`;
    if (!url.includes(marker) || url.includes('/image/upload/f_auto')) return url;
    return url.replace(marker, `${marker}f_auto,q_auto,w_${width},c_fill/`);
  }

  private assertConfigured(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException({
        code: 'image_service_unconfigured',
        message:
          'Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the API.',
      });
    }
  }

  private sign(params: Record<string, string>): string {
    const toSign = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return createHash('sha1').update(`${toSign}${this.apiSecret}`).digest('hex');
  }

  private async request(url: string, body: FormData): Promise<CloudinaryUploadResponse> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      this.logger.error(`Cloudinary request failed: ${(error as Error).message}`);
      throw new BadGatewayException({
        code: 'image_service_unavailable',
        message: 'Image storage is temporarily unavailable. Please try again.',
      });
    }

    const payload = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;
    if (!response.ok) {
      this.logger.warn(
        `Cloudinary responded ${response.status}: ${payload.error?.message ?? 'unknown error'}`,
      );
      throw new BadGatewayException({
        code: 'image_service_rejected',
        message: 'Image storage rejected the upload. Please try a different file.',
      });
    }

    return payload;
  }
}
