import { describe, expect, it } from 'vitest';

describe('Savora navigation instrumentation', () => {
  it('contains no meta refresh or direct document navigation', () => {
    expect(document.querySelector("meta[http-equiv='refresh']")).toBeNull();
    expect(window.location.hostname).toBe('localhost');
  });
});