import type { TransformFnParams } from 'class-transformer';

/**
 * Accepts the full-precision numeric strings/numbers browsers produce for GPS
 * and rounds them to a storage-safe precision instead of rejecting them.
 *
 * A browser reports `35.521547423412`, which is a perfectly valid latitude but
 * has more decimal places than a fixed `@IsNumber({ maxDecimalPlaces })`
 * constraint allows. Validation must reject impossible values (NaN, infinity,
 * out-of-range coordinates), not ordinary GPS precision.
 */
export function roundNumericValue(places: number) {
  return ({ value }: TransformFnParams): unknown => {
    const numeric =
      typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      return numeric;
    }

    return Number(numeric.toFixed(places));
  };
}
