import {
  Body,
  Controller,
  Delete,
  Get,
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
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import type {
  PromotionPreview,
  PromotionResponse,
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
  listAdmin(): Promise<PromotionResponse[]> {
    return this.promotionsService.listAdmin();
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
    });
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deactivate(@Param('id') id: string): Promise<PromotionResponse> {
    return this.promotionsService.deactivate(id);
  }
}
