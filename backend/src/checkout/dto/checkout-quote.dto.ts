import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuoteSelectedOptionDto {
  @IsMongoId()
  groupId: string;

  @IsMongoId()
  optionId: string;
}

export class QuoteItemDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuoteSelectedOptionDto)
  selectedOptions?: QuoteSelectedOptionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}

export class CheckoutQuoteDto {
  @IsMongoId()
  restaurantId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;
}
