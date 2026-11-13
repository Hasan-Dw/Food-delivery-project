import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  PUBLIC_REGISTRATION_ROLES,
  VehicleType,
} from '../../common/enums/user.enum';

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
}

export class DriverRegistrationDto {
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must use digits, spaces, brackets or a leading +',
  })
  phone: string;

  @IsString()
  @Length(2, 120)
  serviceArea: string;

  @IsEnum(VehicleType)
  vehicle: VehicleType;
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
}
