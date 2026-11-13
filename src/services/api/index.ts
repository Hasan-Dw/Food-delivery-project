import { env } from '@/config/env';
import { ApiClient } from './client';
import { authToken } from './auth-token';

export const apiClient = new ApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: env.apiTimeoutMs,
  getAccessToken: () => authToken.get(),
});

export { ApiError, getErrorMessage, isApiError } from './errors';
export { authToken, onUnauthorized } from './auth-token';
export type { RequestOptions } from './client';
