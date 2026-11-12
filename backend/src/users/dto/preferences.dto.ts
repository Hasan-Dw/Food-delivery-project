import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DietaryPreference } from '../../common/enums/user.enum';

const PHONE_PATTERN = /^[+()\-\s\d]{7,40}$/;

export class PreferencesDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DietaryPreference, { each: true })
  dietary?: DietaryPreference[];

  @IsOptional()
  @IsBoolean()
  emailReceipts?: boolean;

  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class UpdatePreferencesDto extends PreferencesDto {}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phone must use digits, spaces, brackets or a leading +',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  avatarKey?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}
