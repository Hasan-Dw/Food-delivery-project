import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { PromotionScope, PromotionStatus } from '../../common/enums/promotion.enum';

/** Server-side filters for the admin coupon table. */
export class PromotionQueryDto {
  @IsOptional()
  @IsEnum(PromotionScope)
  scope?: PromotionScope;

  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}
