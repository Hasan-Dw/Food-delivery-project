import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

/** A menu section that belongs to the authenticated owner's restaurant. */
export class CreateMenuCategoryDto {
  @IsString()
  @Length(1, 60)
  name: string;

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

export class UpdateMenuCategoryDto extends PartialType(CreateMenuCategoryDto) {}
