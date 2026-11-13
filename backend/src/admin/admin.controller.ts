import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { DriverResponse } from '../drivers/interfaces/driver-response.interface';
import type { UserResponse } from '../users/interfaces/user-response.interface';
import { AdminService } from './admin.service';
import {
  AdminAccountQueryDto,
  AdminDriverQueryDto,
  UpdateAccountStatusDto,
} from './dto/admin.dto';

@ApiTags('Administration')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('accounts')
  listAccounts(@Query() query: AdminAccountQueryDto): Promise<UserResponse[]> {
    return this.adminService.listAccounts(query);
  }

  @Get('drivers')
  listDrivers(@Query() query: AdminDriverQueryDto): Promise<DriverResponse[]> {
    return this.adminService.listDrivers(query);
  }

  @Patch('accounts/:id/status')
  updateAccountStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
  ): Promise<UserResponse> {
    return this.adminService.updateAccountStatus(actor, id, dto);
  }
}
