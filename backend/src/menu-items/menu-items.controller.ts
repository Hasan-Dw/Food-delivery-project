import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import type { PaginatedResult } from '../common/dto/pagination-query.dto';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MAX_IMAGE_BYTES } from '../uploads/image-file.util';
import type { UploadedImageFile } from '../uploads/image-file.util';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuItemQueryDto } from './dto/menu-item-query.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import type { MenuItemResponse } from './interfaces/menu-item-response.interface';
import { MenuItemsService } from './menu-items.service';

@ApiTags('Menu items')
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Public()
  @Get()
  list(@Query() query: MenuItemQueryDto): Promise<PaginatedResult<MenuItemResponse>> {
    return this.menuItemsService.list(query);
  }

  @Public()
  @Get('popular')
  popular(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ): Promise<MenuItemResponse[]> {
    return this.menuItemsService.listPopular(limit);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<MenuItemResponse> {
    return this.menuItemsService.getById(id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMenuItemDto,
  ): Promise<MenuItemResponse> {
    return this.menuItemsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponse> {
    return this.menuItemsService.update(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Patch(':id/availability')
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<MenuItemResponse> {
    return this.menuItemsService.updateAvailability(user.id, id, dto.available);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER)
  @RequireApproved()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.menuItemsService.delete(user.id, id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @RequireApproved()
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ): Promise<MenuItemResponse> {
    return this.menuItemsService.updateImage(user, id, file);
  }

  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @RequireApproved()
  @Delete(':id/image')
  removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MenuItemResponse> {
    return this.menuItemsService.removeImage(user, id);
  }
}

@ApiTags('Menu items')
@Controller('restaurants')
export class RestaurantMenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Public()
  @Get(':id/menu-items')
  listByRestaurant(@Param('id') id: string): Promise<MenuItemResponse[]> {
    return this.menuItemsService.listByRestaurant(id);
  }
}
