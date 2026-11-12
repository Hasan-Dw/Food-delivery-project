import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  DriverLocationDto,
  DriverQueryDto,
  UpdateDriverAvailabilityDto,
} from './dto/driver.dto';
import { DriversService } from './drivers.service';
import type {
  DriverLocationResponse,
  DriverResponse,
} from './interfaces/driver-response.interface';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  list(@Query() query: DriverQueryDto): Promise<DriverResponse[]> {
    return this.driversService.list(query);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Get('by-user/:userId')
  getByUserId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<DriverResponse> {
    return this.driversService.getByUserId(user, userId);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DriverResponse> {
    return this.driversService.getById(user, id);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Patch(':id/availability')
  setAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDriverAvailabilityDto,
  ): Promise<DriverResponse> {
    return this.driversService.setAvailability(user, id, dto.availability);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Get(':id/location')
  getLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DriverLocationResponse | null> {
    return this.driversService.getLocation(user, id);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Put(':id/location')
  updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DriverLocationDto,
  ): Promise<DriverLocationResponse> {
    return this.driversService.updateLocation(user, id, dto);
  }
}
