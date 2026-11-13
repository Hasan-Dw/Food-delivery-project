import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, RequireApproved, Roles } from '../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { PaginatedResult } from '../common/dto/pagination-query.dto';
import { UserRole } from '../common/enums/user.enum';
import { MAX_IMAGE_BYTES } from '../uploads/image-file.util';
import type { UploadedImageFile } from '../uploads/image-file.util';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantAnalyticsQueryDto } from './dto/restaurant-analytics-query.dto';
import { RestaurantQueryDto } from './dto/restaurant-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import type { RestaurantAnalyticsResponse } from './analytics/restaurant-analytics.interface';
import { RestaurantAnalyticsService } from './analytics/restaurant-analytics.service';
import type {
  MenuCategoryResponse,
  RestaurantResponse,
} from './interfaces/restaurant-response.interface';
import {
  RestaurantsService,
  type CreateRestaurantInput,
  type UpdateRestaurantInput,
} from './restaurants.service';

function toCreateInput(dto: CreateRestaurantDto): CreateRestaurantInput {
  return {
    name: dto.name,
    tagline: dto.tagline,
    cuisines: dto.cuisines,
    categorySlugs: dto.categorySlugs,
    imageKey: dto.imageKey,
    address: {
      line1: dto.address.line1,
      line2: dto.address.line2,
      city: dto.address.city,
      state: dto.address.state,
      postalCode: dto.address.postalCode,
      country: dto.address.country,
      latitude: dto.address.latitude,
      longitude: dto.address.longitude,
    },
    openingHours: dto.openingHours,
    deliveryFee: dto.deliveryFee,
    minOrder: dto.minOrder,
    priceLevel: dto.priceLevel,
    estimatedDeliveryMinutes: dto.estimatedDeliveryMinutes,
    isOpen: dto.isOpen,
    description: dto.description,
    offerLabel: dto.offerLabel,
  };
}

function toUpdateInput(dto: UpdateRestaurantDto): UpdateRestaurantInput {
  const input: UpdateRestaurantInput = {};

  if (dto.name !== undefined) input.name = dto.name;
  if (dto.tagline !== undefined) input.tagline = dto.tagline;
  if (dto.cuisines !== undefined) input.cuisines = dto.cuisines;
  if (dto.categorySlugs !== undefined) input.categorySlugs = dto.categorySlugs;
  if (dto.imageKey !== undefined) input.imageKey = dto.imageKey;
  if (dto.deliveryFee !== undefined) input.deliveryFee = dto.deliveryFee;
  if (dto.minOrder !== undefined) input.minOrder = dto.minOrder;
  if (dto.priceLevel !== undefined) input.priceLevel = dto.priceLevel;
  if (dto.estimatedDeliveryMinutes !== undefined) {
    input.estimatedDeliveryMinutes = dto.estimatedDeliveryMinutes;
  }
  if (dto.isOpen !== undefined) input.isOpen = dto.isOpen;
  if (dto.description !== undefined) input.description = dto.description;
  if (dto.offerLabel !== undefined) input.offerLabel = dto.offerLabel;
  if (dto.openingHours !== undefined) input.openingHours = dto.openingHours;

  if (dto.address !== undefined) {
    input.address = {
      line1: dto.address.line1,
      line2: dto.address.line2,
      city: dto.address.city,
      state: dto.address.state,
      postalCode: dto.address.postalCode,
      country: dto.address.country,
      latitude: dto.address.latitude,
      longitude: dto.address.longitude,
    };
  }

  return input;
}

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly analyticsService: RestaurantAnalyticsService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: RestaurantQueryDto): Promise<PaginatedResult<RestaurantResponse>> {
    return this.restaurantsService.list(query);
  }

  @Public()
  @Get('featured')
  featured(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ): Promise<RestaurantResponse[]> {
    return this.restaurantsService.getFeatured(limit);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<RestaurantResponse[]> {
    return this.restaurantsService.listMine(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Get('mine/analytics')
  getMyAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RestaurantAnalyticsQueryDto,
  ): Promise<RestaurantAnalyticsResponse> {
    return this.analyticsService.getForOwner(user, query.range);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @RequireApproved()
  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: RestaurantAnalyticsQueryDto,
  ): Promise<RestaurantAnalyticsResponse> {
    return this.analyticsService.getForActor(user, id, query.range);
  }

  @Public()
  @Get(':id/menu-categories')
  listMenuCategories(@Param('id') id: string): Promise<MenuCategoryResponse[]> {
    return this.restaurantsService.listMenuCategories(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRestaurantDto,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.createForOwner(user.id, toCreateInput(dto));
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @RequireApproved()
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.updateForActor(user, id, toUpdateInput(dto));
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  uploadCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.updateImage(user, id, 'cover', file);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @Delete(':id/image')
  removeCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.removeImage(user, id, 'cover');
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.updateImage(user, id, 'logo', file);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @Delete(':id/logo')
  removeLogo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RestaurantResponse> {
    return this.restaurantsService.removeImage(user, id, 'logo');
  }

  @Public()
  @Get(':idOrSlug')
  getByIdOrSlug(@Param('idOrSlug') idOrSlug: string): Promise<RestaurantResponse> {
    return this.restaurantsService.getByIdOrSlug(idOrSlug);
  }
}

@ApiTags('Restaurants')
@Controller('restaurant-categories')
export class RestaurantCategoriesController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Public()
  @Get()
  list() {
    return this.restaurantsService.listCategories();
  }
}
