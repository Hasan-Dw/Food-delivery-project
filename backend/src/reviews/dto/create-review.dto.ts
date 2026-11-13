import {
  IsInt,
  IsMongoId,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  orderId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}