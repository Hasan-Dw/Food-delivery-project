import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { TrackingService, type TrackingSnapshotResponse } from './tracking.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('orders')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get(':orderId/tracking')
  getSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<TrackingSnapshotResponse> {
    return this.trackingService.getSnapshot(user, orderId);
  }
}
