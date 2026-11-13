import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DeliveryAction, AutoAssignmentTrigger } from '../../common/enums/delivery.enum';

/**
 * The browser may send an `actorId` for display purposes. It is accepted by the
 * DTO so requests are not rejected, but the service always derives the
 * administrator from the bearer token and ignores this value.
 */
export class CreateDeliveryDto {
  @IsMongoId()
  orderId: string;

  @IsOptional()
  @IsString()
  @Length(8, 120)
  idempotencyKey?: string;
}

export class AssignDeliveryDto {
  @IsMongoId()
  driverId: string;

  @IsOptional()
  @IsMongoId()
  actorId?: string;
}

export class AutoAssignDeliveryDto {
  @IsOptional()
  @IsEnum(AutoAssignmentTrigger)
  trigger?: AutoAssignmentTrigger;

  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsMongoId({ each: true })
  excludeDriverIds?: string[];

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class UnassignDeliveryDto {
  @IsString()
  @Length(2, 240)
  reason: string;

  @IsOptional()
  @IsMongoId()
  actorId?: string;
}

export class ReassignDeliveryDto {
  @IsMongoId()
  driverId: string;

  @IsString()
  @Length(2, 240)
  reason: string;

  @IsOptional()
  @IsMongoId()
  actorId?: string;
}

export class TransitionDeliveryDto {
  @IsEnum(DeliveryAction)
  action: DeliveryAction;
}

export class DeliveryLocationDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(300)
  speedKph?: number;
}

export class DeliveryQueryDto {
  @IsOptional()
  @IsMongoId()
  driverId?: string;
}
