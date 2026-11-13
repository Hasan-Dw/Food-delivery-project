import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { paginate, type PaginatedResult } from '../common/dto/pagination-query.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MenuCategory } from '../restaurants/schemas/menu-category.schema';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UploadsService } from '../uploads/uploads.service';
import type { UploadedImageFile } from '../uploads/image-file.util';
import type { CreateMenuItemDto, MenuOptionGroupDto } from './dto/create-menu-item.dto';
import type { MenuItemQueryDto } from './dto/menu-item-query.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import type { MenuItemResponse } from './interfaces/menu-item-response.interface';
import { toMenuItemResponse } from './menu-item.mapper';
import { MenuItem, type MenuItemDocument } from './schemas/menu-item.schema';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private readonly itemModel: Model<MenuItemDocument>,
    @InjectModel(MenuCategory.name)
    private readonly categoryModel: Model<MenuCategory>,
    private readonly restaurantsService: RestaurantsService,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: MenuItemQueryDto): Promise<PaginatedResult<MenuItemResponse>> {
    const filter: FilterQuery<MenuItemDocument> = {};

    if (query.restaurantId) {
      const approved = await this.restaurantsService.approvedRestaurantExists(
        query.restaurantId,
      );
      if (!approved) {
        throw new NotFoundException({
          code: 'restaurant_not_found',
          message: 'That restaurant could not be found.',
        });
      }
      filter.restaurantId = new Types.ObjectId(query.restaurantId);
    } else {
      filter.restaurantId = {
        $in: await this.restaurantsService.approvedRestaurantIds(),
      };
    }

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }

    if (query.popular !== undefined) {
      filter.isPopular = query.popular;
    }

    if (query.search?.trim()) {
      const pattern = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [{ name: pattern }, { description: pattern }];
    }

    const [documents, total] = await Promise.all([
      this.itemModel
        .find(filter)
        .sort({ isPopular: -1, name: 1 })
        .skip((query.page - 1) * query.perPage)
        .limit(query.perPage)
        .exec(),
      this.itemModel.countDocuments(filter).exec(),
    ]);

    return paginate(documents.map(toMenuItemResponse), total, query.page, query.perPage);
  }

  async listPopular(limit = 8): Promise<MenuItemResponse[]> {
    const restaurantIds = await this.restaurantsService.approvedRestaurantIds();
    const documents = await this.itemModel
      .find({
        restaurantId: { $in: restaurantIds },
        isPopular: true,
        available: true,
      })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(Math.min(Math.max(limit, 1), 24))
      .exec();

    return documents.map(toMenuItemResponse);
  }

  async listByRestaurant(idOrSlug: string): Promise<MenuItemResponse[]> {
    const restaurant = await this.restaurantsService.findApprovedRestaurant(idOrSlug);
    const documents = await this.itemModel
      .find({ restaurantId: restaurant._id })
      .sort({ categoryId: 1, name: 1 })
      .exec();

    return documents.map(toMenuItemResponse);
  }

  async getById(id: string): Promise<MenuItemResponse> {
    const document = await this.findItem(id);

    if (
      !(await this.restaurantsService.approvedRestaurantExists(
        document.restaurantId.toString(),
      ))
    ) {
      throw new NotFoundException({
        code: 'menu_item_not_found',
        message: 'That menu item could not be found.',
      });
    }

    return toMenuItemResponse(document);
  }

  async create(ownerId: string, dto: CreateMenuItemDto): Promise<MenuItemResponse> {
    const restaurant = await this.restaurantsService.findOwnedRestaurant(
      ownerId,
      dto.restaurantId,
    );
    await this.assertCategoryBelongsToRestaurant(restaurant._id, dto.categoryId);
    const optionGroups = this.validateOptionGroups(dto.optionGroups ?? []);

    const document = await this.itemModel.create({
      restaurantId: restaurant._id,
      categoryId: new Types.ObjectId(dto.categoryId),
      name: dto.name.trim(),
      description: dto.description.trim(),
      priceCents: toCents(dto.price),
      imageKey: dto.imageKey.trim(),
      calories: dto.calories,
      isPopular: dto.isPopular ?? false,
      isVegetarian: dto.isVegetarian ?? false,
      isSpicy: dto.isSpicy ?? false,
      available: dto.available ?? true,
      optionGroups,
    });

    return toMenuItemResponse(document);
  }

  async update(
    ownerId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponse> {
    const document = await this.findItem(itemId);
    const restaurant = await this.restaurantsService.findOwnedRestaurant(
      ownerId,
      document.restaurantId.toString(),
    );

    if (dto.categoryId !== undefined) {
      await this.assertCategoryBelongsToRestaurant(restaurant._id, dto.categoryId);
      document.categoryId = new Types.ObjectId(dto.categoryId);
    }

    if (dto.name !== undefined) document.name = dto.name.trim();
    if (dto.description !== undefined) document.description = dto.description.trim();
    if (dto.price !== undefined) document.priceCents = toCents(dto.price);
    if (dto.imageKey !== undefined) document.imageKey = dto.imageKey.trim();
    if (dto.calories !== undefined) document.calories = dto.calories;
    if (dto.isPopular !== undefined) document.isPopular = dto.isPopular;
    if (dto.isVegetarian !== undefined) document.isVegetarian = dto.isVegetarian;
    if (dto.isSpicy !== undefined) document.isSpicy = dto.isSpicy;
    if (dto.available !== undefined) document.available = dto.available;
    if (dto.optionGroups !== undefined) {
      document.optionGroups = this.validateOptionGroups(dto.optionGroups) as never;
    }

    await document.save();
    return toMenuItemResponse(document);
  }

  async updateAvailability(
    ownerId: string,
    itemId: string,
    available: boolean,
  ): Promise<MenuItemResponse> {
    return this.update(ownerId, itemId, { available });
  }

  async delete(ownerId: string, itemId: string): Promise<void> {
    const document = await this.findItem(itemId);
    await this.restaurantsService.findOwnedRestaurant(
      ownerId,
      document.restaurantId.toString(),
    );
    const publicId = document.imagePublicId;
    await document.deleteOne();
    // Only delete the asset once the menu item record is gone.
    await this.uploads.discard(publicId);
  }

  /**
   * Uploads or replaces a menu item image. The previous Cloudinary asset is
   * removed only after the database has accepted the new URL.
   */
  async updateImage(
    actor: AuthenticatedUser,
    itemId: string,
    file: UploadedImageFile | undefined,
  ): Promise<MenuItemResponse> {
    const document = await this.findItem(itemId);
    const restaurant = await this.restaurantsService.findRestaurantForManagement(
      actor,
      document.restaurantId.toString(),
    );

    const stored = await this.uploads.store(file, {
      folder: `menu-items/restaurant-${this.uploads.safeId(restaurant._id.toString())}`,
      name: `item-${this.uploads.safeId(itemId)}`,
    });
    const previous = document.imagePublicId;

    try {
      document.imageKey = stored.url;
      document.imagePublicId = stored.publicId;
      await document.save();
    } catch (error) {
      await this.uploads.discard(stored.publicId);
      throw error;
    }

    await this.uploads.discard(previous);
    return toMenuItemResponse(document);
  }

  async removeImage(
    actor: AuthenticatedUser,
    itemId: string,
  ): Promise<MenuItemResponse> {
    const document = await this.findItem(itemId);
    await this.restaurantsService.findRestaurantForManagement(
      actor,
      document.restaurantId.toString(),
    );

    const previous = document.imagePublicId;
    document.imageKey = 'product-default';
    document.imagePublicId = undefined;
    await document.save();

    await this.uploads.discard(previous);
    return toMenuItemResponse(document);
  }

  private async findItem(id: string): Promise<MenuItemDocument> {
    const document = Types.ObjectId.isValid(id)
      ? await this.itemModel.findById(id).exec()
      : null;

    if (!document) {
      throw new NotFoundException({
        code: 'menu_item_not_found',
        message: 'That menu item could not be found.',
      });
    }

    return document;
  }

  private async assertCategoryBelongsToRestaurant(
    restaurantId: Types.ObjectId,
    categoryId: string,
  ): Promise<void> {
    const exists = await this.categoryModel.exists({
      _id: new Types.ObjectId(categoryId),
      restaurantId,
    });

    if (!exists) {
      throw new BadRequestException({
        code: 'invalid_category',
        message: 'That menu category does not belong to this restaurant.',
        details: { categoryId: ['Choose a category from the restaurant menu.'] },
      });
    }
  }

  private validateOptionGroups(
    groups: MenuOptionGroupDto[],
  ): Array<{
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{ name: string; priceDeltaCents: number; isDefault: boolean }>;
  }> {
    return groups.map((group) => {
      if (group.minSelections > group.maxSelections) {
        throw new BadRequestException({
          code: 'invalid_option_group',
          message: 'A minimum selection cannot be greater than the maximum.',
          details: { optionGroups: [group.name] },
        });
      }

      if (group.maxSelections > group.options.length) {
        throw new BadRequestException({
          code: 'invalid_option_group',
          message: 'A maximum selection cannot exceed the number of options.',
          details: { optionGroups: [group.name] },
        });
      }

      return {
        name: group.name.trim(),
        required: Boolean(group.required),
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        options: group.options.map((option) => ({
          name: option.name.trim(),
          priceDeltaCents: toCents(option.priceDelta),
          isDefault: Boolean(option.isDefault),
        })),
      };
    });
  }
}
