import { Transform } from 'class-transformer';
import { IsBoolean, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class MenuItemQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  popular?: boolean;
}
