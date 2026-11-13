import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateOrderDto, OrderQueryDto, OrderTransitionDto } from './dto/order.dto';
import type { OrderResponse } from './interfaces/order-response.interface';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.CUSTOMER)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.ordersService.create(user, dto);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQueryDto,
  ): Promise<OrderResponse[]> {
    return this.ordersService.list(user, query);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get('active')
  getActive(@CurrentUser() user: AuthenticatedUser): Promise<OrderResponse | null> {
    return this.ordersService.getActive(user);
  }

  @Roles(
    UserRole.CUSTOMER,
    UserRole.RESTAURANT_OWNER,
    UserRole.DRIVER,
    UserRole.ADMIN,
  )
  @Get(':id/history')
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Awaited<ReturnType<OrdersService['getStatusHistory']>>> {
    return this.ordersService.getStatusHistory(user, id);
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
  ): Promise<OrderResponse> {
    return this.ordersService.getById(user, id);
  }

  @Roles(UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @Post(':id/transition')
  transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OrderTransitionDto,
  ): Promise<OrderResponse> {
    return this.ordersService.transition(user, id, dto.action, dto.reason);
  }
}
