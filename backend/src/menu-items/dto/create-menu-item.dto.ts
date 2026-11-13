import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuOptionDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  priceDelta: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class MenuOptionGroupDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsBoolean()
  required: boolean;

  @IsInt()
  @Min(0)
  @Max(10)
  minSelections: number;

  @IsInt()
  @Min(1)
  @Max(20)
  maxSelections: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MenuOptionDto)
  options: MenuOptionDto[];
}

export class CreateMenuItemDto {
  @IsMongoId()
  restaurantId: string;

  @IsMongoId()
  categoryId: string;

  @IsString()
  @Length(2, 120)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  price: number;

  @IsString()
  @MaxLength(120)
  imageKey: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  calories?: number;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @IsOptional()
  @IsBoolean()
  isSpicy?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MenuOptionGroupDto)
  optionGroups?: MenuOptionGroupDto[];
}
