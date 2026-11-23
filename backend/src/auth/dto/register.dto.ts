import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PUBLIC_REGISTRATION_ROLES,
  VehicleType,
} from '../../common/enums/user.enum';
import { AddressInputDto } from '../../users/dto/address.dto';

const PHONE_PATTERN = /^[+()\-\s\d]{7,40}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RestaurantRegistrationDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsString()
  @Length(3, 180)
  address: string;

  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must use digits, spaces, brackets or a leading +',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class DriverRegistrationDto {
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must use digits, spaces, brackets or a leading +',
  })
  phone: string;

  @IsEnum(VehicleType)
  vehicle: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceArea?: string;
}

export class RegisterDto {
  @IsString()
  @Length(2, 80)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 72)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must include at least one letter and one number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must use digits, spaces, brackets or a leading +',
  })
  phone?: string;

  @IsOptional()
  @IsIn(PUBLIC_REGISTRATION_ROLES)
  role?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RestaurantRegistrationDto)
  restaurant?: RestaurantRegistrationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DriverRegistrationDto)
  driver?: DriverRegistrationDto;

  /**
   * Customer default delivery address captured during registration. Optional so
   * existing clients keep working; when present it is validated for the Latakia
   * service area and stored as the customer's default address.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  defaultAddress?: AddressInputDto;
}
