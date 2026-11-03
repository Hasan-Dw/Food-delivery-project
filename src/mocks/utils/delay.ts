/**
 * Deterministic-feeling latency for mock services. Keeping this tiny helper in
 * one place makes it easy to remove once real endpoints exist.
 */
export function delay(ms = 350, jitter = 120): Promise<void> {
  const duration = ms + Math.random() * jitter;
  return new Promise((resolve) => setTimeout(resolve, duration));
}
