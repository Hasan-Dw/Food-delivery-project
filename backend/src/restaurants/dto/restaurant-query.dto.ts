import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum RestaurantSort {
  RECOMMENDED = 'recommended',
  RATING = 'rating',
  DELIVERY_TIME = 'delivery_time',
  DELIVERY_FEE = 'delivery_fee',
}

export class RestaurantQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsEnum(RestaurantSort)
  sort?: RestaurantSort;
}
