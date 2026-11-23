import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { AccountStatus, DriverAvailability } from '../../common/enums/user.enum';
import { roundNumericValue } from '../../common/utils/dto-number.util';

export class DriverQueryDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsEnum(DriverAvailability)
  availability?: DriverAvailability;
}

export class UpdateDriverAvailabilityDto {
  @IsEnum(DriverAvailability)
  availability: DriverAvailability;
}

export class DriverLocationDto {
  @Transform(roundNumericValue(6))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat: number;

  @Transform(roundNumericValue(6))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Transform(roundNumericValue(2))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @Transform(roundNumericValue(2))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(300)
  speedKph?: number;
}
