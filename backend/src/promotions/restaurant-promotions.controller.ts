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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireApproved, Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionStatusDto } from './dto/promotion-status.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import type {
  PromotionResponse,
  PromotionUsageResponse,
} from './interfaces/promotion-response.interface';
import { PromotionsService } from './promotions.service';

/**
 * Restaurant-owner coupon management. Ownership is always resolved from the
 * authenticated account, never from a request-supplied restaurant id, so an
 * owner can only ever see or change their own restaurant's coupons.
 */
@ApiTags('Restaurant Promotions')
@ApiBearerAuth()
@Controller('restaurant-promotions')
@Roles(UserRole.RESTAURANT_OWNER)
@RequireApproved()
export class RestaurantPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('policy')
  policy(): ReturnType<PromotionsService['getPolicy']> {
    return this.promotionsService.getPolicy();
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<PromotionResponse[]> {
    return this.promotionsService.listMine(user);
  }

  @Get(':id/usage')
  usage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PromotionUsageResponse> {
    return this.promotionsService.getUsage(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.createForOwner(user, dto);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PromotionStatusDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.setStatus(id, dto.active, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.promotionsService.remove(id, user);
  }
}
