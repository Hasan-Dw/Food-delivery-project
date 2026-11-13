/**
 * Auth boundary for the transport layer.
 *
 * The API client never reads storage directly. The auth feature writes the
 * token here, and a future backend can swap the implementation without the
 * client or services changing.
 */
let accessToken: string | null = null;
let unauthorizedTimeout: ReturnType<typeof setTimeout> | null = null;
const unauthorizedListeners = new Set<() => void>();

export const authToken = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
};

/** Emits once per tick so several parallel 401s do not trigger a redirect storm. */
export function emitUnauthorized(): void {
  if (unauthorizedTimeout) return;
  unauthorizedTimeout = setTimeout(() => {
    unauthorizedTimeout = null;
    unauthorizedListeners.forEach((listener) => listener());
  }, 0);
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}
