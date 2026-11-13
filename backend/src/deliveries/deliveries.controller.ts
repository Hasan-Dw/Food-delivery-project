import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DeliveriesService } from './deliveries.service';
import type { DeliveryResponse } from './delivery.mapper';
import {
  AssignDeliveryDto,
  AutoAssignDeliveryDto,
  CreateDeliveryDto,
  DeliveryLocationDto,
  ReassignDeliveryDto,
  TransitionDeliveryDto,
  UnassignDeliveryDto,
} from './dto/delivery.dto';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @Post()
  createForOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.createForOrder(user, dto);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<DeliveryResponse[]> {
    return this.deliveriesService.list(user);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Get('active')
  getActive(
    @CurrentUser() user: AuthenticatedUser,
    @Query('driverId') driverId?: string,
  ): Promise<DeliveryResponse | null> {
    return this.deliveriesService.getActiveForDriver(user, driverId);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get('by-order/:orderId')
  getByOrderId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.getByOrderId(user, orderId);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/assign')
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignDeliveryDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.assign(user, id, dto.driverId);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/auto-assign')
  autoAssign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AutoAssignDeliveryDto,
  ): Promise<Awaited<ReturnType<DeliveriesService['autoAssign']>>> {
    return this.deliveriesService.autoAssign(user, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/unassign')
  unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UnassignDeliveryDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.unassign(user, id, dto.reason);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/reassign')
  reassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReassignDeliveryDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.reassign(user, id, dto.driverId, dto.reason);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Post(':id/transition')
  transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TransitionDeliveryDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.transition(user, id, dto.action);
  }

  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Put(':id/location')
  updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeliveryLocationDto,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.updateLocation(user, id, dto);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DeliveryResponse> {
    return this.deliveriesService.getById(user, id);
  }
}
