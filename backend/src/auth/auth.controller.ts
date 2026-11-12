import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { UserResponse } from '../users/interfaces/user-response.interface';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  PasswordResetConfirmDto,
  PasswordResetDto,
} from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import type {
  AuthSessionResponse,
  PasswordResetResponse,
} from './interfaces/auth.interfaces';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthSessionResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthSessionResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() dto: PasswordResetDto): Promise<PasswordResetResponse> {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
  ): Promise<PasswordResetResponse> {
    return this.authService.confirmPasswordReset(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {
    this.authService.logout();
  }

  @ApiBearerAuth()
  @Get('session')
  getSession(@CurrentUser() user: AuthenticatedUser): Promise<AuthSessionResponse> {
    return this.authService.getSession(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.usersService.getProfile(user.id);
  }
}
