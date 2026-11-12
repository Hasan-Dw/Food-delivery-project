import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

/** Lightweight preview used before checkout. Order creation revalidates. */
export class ValidatePromotionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(3, 24)
  code: string;

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  /** Display-only subtotal in decimal currency; never trusted for an order. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  subtotal?: number;
}
