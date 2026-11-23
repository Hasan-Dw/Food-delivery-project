import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  PromotionAccent,
  PromotionDiscountType,
  PromotionScope,
} from '../../common/enums/promotion.enum';

export class CreatePromotionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(3, 24)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code may only contain letters, numbers, underscores and dashes',
  })
  code: string;

  @IsString()
  @Length(2, 120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  imageKey?: string;

  @IsOptional()
  @IsEnum(PromotionAccent)
  accent?: PromotionAccent;

  @IsEnum(PromotionDiscountType)
  discountType: PromotionDiscountType;

  /** Percent for PERCENTAGE; decimal currency for FIXED; omitted for FREE_DELIVERY. */
  @ValidateIf((dto: CreatePromotionDto) => dto.discountType !== PromotionDiscountType.FREE_DELIVERY)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  value?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  minOrder?: number;

  /** Cap for percentage and free-delivery coupons. Omit for no cap. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  maxDiscount?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsISO8601()
  expiresAt: string;

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  /**
   * Admins may state the scope explicitly. Owners never reach this field
   * because the owner controller forces RESTAURANT scope from the token.
   */
  @IsOptional()
  @IsEnum(PromotionScope)
  scope?: PromotionScope;

  /** 0 means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  perCustomerLimit?: number;

  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
