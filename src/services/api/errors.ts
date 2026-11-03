import type { ApiErrorBody } from '@/types';

/**
 * Normalised transport error. Every service rejects with this type so UI code
 * can rely on a single error contract regardless of the data source.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly requestId?: string;
  readonly isNetworkError: boolean;

  constructor(
    body: ApiErrorBody,
    status: number,
    options: { isNetworkError?: boolean } = {},
  ) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
    this.isNetworkError = options.isNetworkError ?? false;
  }

  static network(message = 'We could not reach Savora. Check your connection and try again.') {
    return new ApiError({ code: 'network_error', message }, 0, { isNetworkError: true });
  }

  static unauthorized(message = 'Your session has expired. Please sign in again.') {
    return new ApiError({ code: 'unauthorized', message }, 401);
  }

  static unknown(message = 'Something went wrong. Please try again.') {
    return new ApiError({ code: 'unknown_error', message }, 500);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
