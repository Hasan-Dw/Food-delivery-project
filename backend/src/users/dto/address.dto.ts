import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddressLabel } from '../../common/enums/user.enum';

export class CoordinatesDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class AddressInputDto {
  @IsEnum(AddressLabel)
  label: AddressLabel;

  @IsString()
  @Length(3, 160)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @Length(2, 80)
  city: string;

  @IsString()
  @Length(2, 80)
  state: string;

  @IsString()
  @Length(4, 20)
  postalCode: string;

  @IsString()
  @Length(2, 80)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;
}
