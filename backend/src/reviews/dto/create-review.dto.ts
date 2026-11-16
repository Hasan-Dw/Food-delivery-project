import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewType } from '../schemas/review.schema';

export class CreateReviewDto {
  @IsMongoId()
  orderId: string;

  /** Defaults to a restaurant review when omitted (existing clients). */
  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType;

  /** Required for restaurant and menu-item reviews. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** Required for menu-item reviews. */
  @IsOptional()
  @IsMongoId()
  menuItemId?: string;

  /** Delivery reviews: how the delivery itself went. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryRating?: number;

  /** Delivery reviews: the overall Savora service experience. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
