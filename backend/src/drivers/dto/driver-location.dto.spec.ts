import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DriverLocationDto } from './driver.dto';

async function validateLocation(payload: Record<string, unknown>) {
  const dto = plainToInstance(DriverLocationDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('DriverLocationDto', () => {
  it('normalizes ordinary browser GPS precision instead of rejecting it', async () => {
    const { dto, errors } = await validateLocation({
      lat: 35.521547423412,
      lng: 35.791276382145,
      heading: 123.4567,
      speedKph: 12.34567,
    });

    expect(errors).toHaveLength(0);
    expect(dto.lat).toBe(35.521547);
    expect(dto.lng).toBe(35.791276);
    expect(dto.heading).toBe(123.46);
    expect(dto.speedKph).toBe(12.35);
  });

  it('accepts numeric strings that arrive from form or query serialization', async () => {
    const { dto, errors } = await validateLocation({
      lat: '35.521547423412',
      lng: '35.791276382145',
    });

    expect(errors).toHaveLength(0);
    expect(dto.lat).toBe(35.521547);
    expect(dto.lng).toBe(35.791276);
  });

  it('still rejects impossible coordinates', async () => {
    const outOfRange = await validateLocation({ lat: 91, lng: 35.79 });
    expect(outOfRange.errors.some((error) => error.property === 'lat')).toBe(true);

    const missing = await validateLocation({ lat: 35.52 });
    expect(missing.errors.some((error) => error.property === 'lng')).toBe(true);
  });

  it('rejects non-finite values', async () => {
    const nan = await validateLocation({ lat: Number.NaN, lng: 35.79 });
    expect(nan.errors.some((error) => error.property === 'lat')).toBe(true);

    const notNumeric = await validateLocation({ lat: 'not-a-number', lng: 35.79 });
    expect(notNumeric.errors.some((error) => error.property === 'lat')).toBe(true);
  });

  it('rejects out-of-range heading and speed', async () => {
    const badHeading = await validateLocation({
      lat: 35.52,
      lng: 35.79,
      heading: 400,
    });
    expect(badHeading.errors.some((error) => error.property === 'heading')).toBe(
      true,
    );

    const badSpeed = await validateLocation({
      lat: 35.52,
      lng: 35.79,
      speedKph: -1,
    });
    expect(badSpeed.errors.some((error) => error.property === 'speedKph')).toBe(
      true,
    );
  });
});
