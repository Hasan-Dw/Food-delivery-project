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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { toCents } from '../common/utils/money.util';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { PromotionStatusDto } from './dto/promotion-status.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import type {
  PromotionPreview,
  PromotionResponse,
  PromotionUsageResponse,
} from './interfaces/promotion-response.interface';
import { PromotionsService } from './promotions.service';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get()
  list(@Query('restaurantId') restaurantId?: string): Promise<PromotionResponse[]> {
    return this.promotionsService.listPublic(restaurantId);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Get('admin')
  listAdmin(@Query() query: PromotionQueryDto): Promise<PromotionResponse[]> {
    return this.promotionsService.listAdmin(query);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER)
  @Post('validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidatePromotionDto,
  ): Promise<PromotionPreview> {
    return this.promotionsService.preview({
      code: dto.code,
      customerId: user.id,
      restaurantId: dto.restaurantId,
      subtotalCents: dto.subtotal ? toCents(dto.subtotal) : 0,
      deliveryFeeCents: dto.deliveryFee ? toCents(dto.deliveryFee) : 0,
    });
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Get(':id/usage')
  usage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PromotionUsageResponse> {
    return this.promotionsService.getUsage(id, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PromotionStatusDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.setStatus(id, dto.active, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.update(id, dto, user);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.promotionsService.remove(id, user);
  }
}
