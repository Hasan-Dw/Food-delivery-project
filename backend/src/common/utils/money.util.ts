/**
 * Money is stored and calculated in integer cents. Values are only converted to
 * decimal currency at the API boundary, never for arithmetic.
 */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Fixed-width order code derived from the document id. */
export function orderCodeFromId(id: string): string {
  return `SV-${id.slice(-6).toUpperCase()}`;
}
