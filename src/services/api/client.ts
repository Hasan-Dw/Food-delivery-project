import type { ApiResponse } from '@/types';
import { ApiError } from './errors';
import { authToken, emitUnauthorized } from './auth-token';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Attach the bearer token. Defaults to true. */
  auth?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  getAccessToken?: () => string | null;
}

function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
    } else {
      params.append(key, String(value));
    }
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

/**
 * Centralised HTTP client.
 *
 * - Base URL always comes from configuration (never hardcoded in the app).
 * - Auth token, headers, timeouts, errors and 401 handling live in one place.
 * - Every call resolves with a normalised `ApiResponse<T>`.
 */
export class ApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      query,
      headers = {},
      signal,
      timeoutMs = this.config.timeoutMs,
      auth = true,
    } = options;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
    const externalAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', externalAbort, { once: true });

    const token = auth ? (this.config.getAccessToken?.() ?? authToken.get()) : null;
    const url = `${this.config.baseUrl}${path}${buildQuery(query)}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'include',
      });

      if (response.status === 401 && auth) {
        emitUnauthorized();
      }

      if (response.status === 204) {
        return { data: undefined as T };
      }

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? ((await response.json()) as unknown)
        : await response.text();

      if (!response.ok) {
        const errorBody =
          payload && typeof payload === 'object' && 'message' in payload
            ? (payload as { message?: unknown; code?: string; details?: Record<string, string[]> })
            : null;

        throw new ApiError(
          {
            code: (errorBody as { code?: string } | null)?.code ?? `http_${response.status}`,
            message:
              typeof errorBody?.message === 'string'
                ? errorBody.message
                : `Request failed with status ${response.status}.`,
            details: (errorBody as { details?: Record<string, string[]> } | null)?.details,
            requestId: response.headers.get('x-request-id') ?? undefined,
          },
          response.status,
        );
      }

      // Accept both `{ data, meta }` envelopes and plain payloads.
      if (payload && typeof payload === 'object' && 'data' in payload) {
        return payload as ApiResponse<T>;
      }

      return { data: payload as T };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(
          { code: 'request_aborted', message: 'The request was cancelled.' },
          0,
          { isNetworkError: false },
        );
      }
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ApiError(
          { code: 'request_timeout', message: 'The request took too long. Please try again.' },
          408,
        );
      }
      throw ApiError.network();
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', externalAbort);
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
