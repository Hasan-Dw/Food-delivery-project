import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ReviewType } from '../schemas/review.schema';

export class ReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 12;

  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType;
}
