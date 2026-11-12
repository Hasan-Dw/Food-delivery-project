import { IsEmail, IsString, Length, Matches } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class PasswordResetDto {
  @IsEmail()
  email: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  @Length(32, 128)
  token: string;

  @IsString()
  @Length(8, 72)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must include at least one letter and one number',
  })
  password: string;
}
