import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AddressInputDto } from './dto/address.dto';
import { UpdatePreferencesDto, UpdateProfileDto } from './dto/preferences.dto';
import type {
  AddressResponse,
  PaymentMethodResponse,
  UserResponse,
} from './interfaces/user-response.interface';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.usersService.getProfile(user.id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserResponse> {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Get('addresses')
  listAddresses(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponse[]> {
    return this.usersService.listAddresses(user.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddressInputDto,
  ): Promise<AddressResponse> {
    return this.usersService.createAddress(user.id, dto);
  }

  @Put('addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
    @Body() dto: AddressInputDto,
  ): Promise<AddressResponse> {
    return this.usersService.updateAddress(user.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
  ): Promise<void> {
    await this.usersService.deleteAddress(user.id, addressId);
  }

  @Patch('addresses/:id/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
  ): Promise<AddressResponse[]> {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }

  @Get('payment-methods')
  listPaymentMethods(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentMethodResponse[]> {
    return this.usersService.listPaymentMethods(user.id);
  }
}
