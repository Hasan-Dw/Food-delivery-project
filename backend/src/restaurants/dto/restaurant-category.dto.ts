import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

/** Platform-level restaurant category maintained by administrators. */
export class CreateRestaurantCategoryDto {
  @IsString()
  @Length(2, 60)
  name: string;

  @IsString()
  @Length(1, 120)
  imageKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

/**
 * The slug is intentionally immutable once created: restaurants reference the
 * category by slug, so renaming a category must not silently break links.
 */
export class UpdateRestaurantCategoryDto extends PartialType(CreateRestaurantCategoryDto) {}
