import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { paginate, type PaginatedResult } from '../common/dto/pagination-query.dto';
import {
  SERVICE_AREA_CITY,
  SERVICE_AREA_CITY_FILTER,
  isInsideServiceArea,
} from '../common/constants/service-area.constant';
import { RestaurantStatus, UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { toSlug } from '../common/utils/slug.util';
import { UploadsService } from '../uploads/uploads.service';
import type { UploadedImageFile } from '../uploads/image-file.util';
import type {
  MenuCategoryResponse,
  RestaurantCategoryResponse,
  RestaurantResponse,
} from './interfaces/restaurant-response.interface';
import { RestaurantSort, type RestaurantQueryDto } from './dto/restaurant-query.dto';
import {
  CreateRestaurantCategoryDto,
  UpdateRestaurantCategoryDto,
} from './dto/restaurant-category.dto';
import {
  toMenuCategoryResponse,
  toRestaurantCategoryResponse,
  toRestaurantResponse,
} from './restaurant.mapper';
import {
  MenuCategory,
  Restaurant,
  RestaurantCategory,
  type MenuCategoryDocument,
  type RestaurantCategoryDocument,
  type RestaurantDocument,
} from './schemas';

export interface RestaurantAddressInput {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateRestaurantInput {
  name: string;
  tagline?: string;
  cuisines?: string[];
  categorySlugs?: string[];
  imageKey?: string;
  address: RestaurantAddressInput;
  openingHours?: Array<{ day: string; open: string; close: string }>;
  deliveryFee?: number;
  minOrder?: number;
  priceLevel?: number;
  estimatedDeliveryMinutes?: number[];
  isOpen?: boolean;
  description?: string;
  offerLabel?: string;
}

export type UpdateRestaurantInput = Partial<CreateRestaurantInput>;

export type RestaurantImageKind = 'cover' | 'logo';

const DEFAULT_MENU_CATEGORIES = [
  { name: 'Starters', description: 'Small plates to begin with.', sortOrder: 1 },
  { name: 'Mains', description: 'The heart of the menu.', sortOrder: 2 },
  { name: 'Sides', description: 'Worth ordering on their own.', sortOrder: 3 },
  { name: 'Desserts', description: 'Save room for these.', sortOrder: 4 },
  { name: 'Drinks', description: 'Something to sip alongside.', sortOrder: 5 },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(RestaurantCategory.name)
    private readonly categoryModel: Model<RestaurantCategoryDocument>,
    @InjectModel(MenuCategory.name)
    private readonly menuCategoryModel: Model<MenuCategoryDocument>,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: RestaurantQueryDto): Promise<PaginatedResult<RestaurantResponse>> {
    const filter: FilterQuery<RestaurantDocument> = {
      status: RestaurantStatus.APPROVED,
      'address.city': SERVICE_AREA_CITY_FILTER,
    };

    if (query.search?.trim()) {
      const pattern = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [{ name: pattern }, { tagline: pattern }, { cuisines: pattern }];
    }

    if (query.category) {
      filter.categorySlugs = query.category;
    }

    const sort = this.sortFor(query.sort);
    const [documents, total] = await Promise.all([
      this.restaurantModel
        .find(filter)
        .sort(sort)
        .skip((query.page - 1) * query.perPage)
        .limit(query.perPage)
        .exec(),
      this.restaurantModel.countDocuments(filter).exec(),
    ]);

    return paginate(
      documents.map(toRestaurantResponse),
      total,
      query.page,
      query.perPage,
    );
  }

  async listCategories(): Promise<RestaurantCategoryResponse[]> {
    const categories = await this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).exec();

    return Promise.all(
      categories.map(async (category) => {
        const itemCount = await this.restaurantModel.countDocuments({
          status: RestaurantStatus.APPROVED,
          'address.city': SERVICE_AREA_CITY_FILTER,
          categorySlugs: category.slug,
        });
        return toRestaurantCategoryResponse(category, itemCount);
      }),
    );
  }

  async createCategory(
    input: CreateRestaurantCategoryDto,
  ): Promise<RestaurantCategoryResponse> {
    const name = this.normaliseCategoryName(input.name);
    await this.assertCategoryNameAvailable(name);
    const imageKey = this.normaliseCategoryImage(input.imageKey);

    const document = await this.categoryModel.create({
      name,
      slug: await this.generateUniqueCategorySlug(name),
      imageKey,
      description: input.description?.trim() || undefined,
      sortOrder: input.sortOrder ?? 0,
    });

    return toRestaurantCategoryResponse(document, 0);
  }

  async updateCategory(
    categoryId: string,
    input: UpdateRestaurantCategoryDto,
  ): Promise<RestaurantCategoryResponse> {
    const document = await this.findCategory(categoryId);

    if (input.name !== undefined) {
      const name = this.normaliseCategoryName(input.name);
      await this.assertCategoryNameAvailable(name, document._id.toString());
      document.name = name;
    }
    if (input.imageKey !== undefined) {
      document.imageKey = this.normaliseCategoryImage(input.imageKey);
    }
    if (input.description !== undefined) {
      document.description = input.description.trim() || undefined;
    }
    if (input.sortOrder !== undefined) {
      document.sortOrder = input.sortOrder;
    }

    await document.save();
    const itemCount = await this.countRestaurantsUsingCategory(document.slug);
    return toRestaurantCategoryResponse(document, itemCount);
  }

  /**
   * Categories are referenced by slug from every restaurant document. Deleting
   * one while restaurants still use it would leave broken discovery links, so
   * it is refused until administrators move those restaurants first.
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const document = await this.findCategory(categoryId);
    const itemCount = await this.restaurantModel.countDocuments({
      categorySlugs: document.slug,
    });

    if (itemCount > 0) {
      throw new ConflictException({
        code: 'category_in_use',
        message: `This category is still used by ${itemCount} restaurant${itemCount === 1 ? '' : 's'}.`,
        details: { restaurants: [String(itemCount)] },
      });
    }

    await document.deleteOne();
  }

  async findCategory(categoryId: string): Promise<RestaurantCategoryDocument> {
    const document = Types.ObjectId.isValid(categoryId)
      ? await this.categoryModel.findById(categoryId).exec()
      : null;

    if (!document) {
      throw new NotFoundException({
        code: 'restaurant_category_not_found',
        message: 'That restaurant category could not be found.',
      });
    }

    return document;
  }

  private async countRestaurantsUsingCategory(slug: string): Promise<number> {
    return this.restaurantModel.countDocuments({
      status: RestaurantStatus.APPROVED,
      'address.city': SERVICE_AREA_CITY_FILTER,
      categorySlugs: slug,
    });
  }

  private normaliseCategoryName(value: string): string {
    const name = value.trim();
    if (name.length < 2) {
      throw new BadRequestException({
        code: 'invalid_category_name',
        message: 'A category name needs at least two characters.',
        details: { name: ['Enter a longer category name.'] },
      });
    }
    return name;
  }

  private normaliseCategoryImage(value: string): string {
    const imageKey = value.trim();
    if (!imageKey) {
      throw new BadRequestException({
        code: 'invalid_category_image',
        message: 'Choose an image for this category.',
        details: { imageKey: ['Choose a category image.'] },
      });
    }
    return imageKey;
  }

  private async assertCategoryNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const pattern = new RegExp(`^${escapeRegExp(name)}$`, 'i');
    const query: FilterQuery<RestaurantCategoryDocument> = { name: pattern };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };

    if (await this.categoryModel.exists(query)) {
      throw new ConflictException({
        code: 'restaurant_category_exists',
        message: 'A restaurant category with that name already exists.',
        details: { name: ['Choose a different name.'] },
      });
    }
  }

  private async generateUniqueCategorySlug(name: string): Promise<string> {
    const base = toSlug(name) || `category-${Date.now()}`;
    let candidate = base;
    let counter = 2;

    while (await this.categoryModel.exists({ slug: candidate })) {
      candidate = `${base}-${counter}`;
      counter += 1;
      if (counter > 100) {
        candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
        break;
      }
    }

    return candidate;
  }

  async getFeatured(limit = 8): Promise<RestaurantResponse[]> {
    const documents = await this.restaurantModel
      .find({
        status: RestaurantStatus.APPROVED,
        'address.city': SERVICE_AREA_CITY_FILTER,
        featured: true,
      })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(Math.min(Math.max(limit, 1), 24))
      .exec();

    return documents.map(toRestaurantResponse);
  }

  async getByIdOrSlug(idOrSlug: string): Promise<RestaurantResponse> {
    const document = await this.findApprovedRestaurant(idOrSlug);
    return toRestaurantResponse(document);
  }

  async listMine(ownerId: string): Promise<RestaurantResponse[]> {
    const documents = await this.restaurantModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();

    return documents.map(toRestaurantResponse);
  }

  async createForOwner(
    ownerId: string,
    input: CreateRestaurantInput,
    status: RestaurantStatus = RestaurantStatus.PENDING_APPROVAL,
  ): Promise<RestaurantResponse> {
    await this.assertCategoriesExist(input.categorySlugs ?? []);
    this.assertServiceArea(
      input.address.city,
      input.address.latitude,
      input.address.longitude,
    );

    const document = await this.restaurantModel.create({
      ownerId: new Types.ObjectId(ownerId),
      name: input.name.trim(),
      slug: await this.generateUniqueSlug(input.name),
      tagline: input.tagline?.trim() ?? '',
      cuisines: input.cuisines ?? [],
      categorySlugs: input.categorySlugs ?? [],
      imageKey: input.imageKey?.trim() || 'restaurant-default',
      deliveryFee: input.deliveryFee ?? 0,
      minOrder: input.minOrder ?? 0,
      priceLevel: input.priceLevel ?? 2,
      estimatedDeliveryMinutes: input.estimatedDeliveryMinutes ?? [25, 40],
      isOpen: input.isOpen ?? true,
      address: {
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city ?? SERVICE_AREA_CITY,
        state: input.address.state ?? SERVICE_AREA_CITY,
        postalCode: input.address.postalCode ?? '',
        country: input.address.country ?? '',
        label: 'Other',
        isDefault: false,
        coordinates:
          input.address.latitude !== undefined && input.address.longitude !== undefined
            ? { lat: input.address.latitude, lng: input.address.longitude }
            : undefined,
      },
      openingHours: input.openingHours ?? [],
      description: input.description?.trim(),
      offerLabel: input.offerLabel,
      status,
    });

    await this.ensureDefaultMenuCategories(document._id.toString());
    return toRestaurantResponse(document);
  }

  async updateForActor(
    actor: AuthenticatedUser,
    restaurantId: string,
    input: UpdateRestaurantInput,
  ): Promise<RestaurantResponse> {
    const document = await this.findRestaurantForManagement(actor, restaurantId);
    return this.applyUpdate(document, input);
  }

  async update(
    ownerId: string,
    restaurantId: string,
    input: UpdateRestaurantInput,
  ): Promise<RestaurantResponse> {
    const document = await this.findOwnedRestaurant(ownerId, restaurantId);
    return this.applyUpdate(document, input);
  }

  private async applyUpdate(
    document: RestaurantDocument,
    input: UpdateRestaurantInput,
  ): Promise<RestaurantResponse> {

    if (input.categorySlugs !== undefined) {
      await this.assertCategoriesExist(input.categorySlugs);
      document.categorySlugs = input.categorySlugs;
    }

    if (input.name !== undefined) document.name = input.name.trim();
    if (input.tagline !== undefined) document.tagline = input.tagline.trim();
    if (input.cuisines !== undefined) document.cuisines = input.cuisines;
    if (input.imageKey !== undefined) document.imageKey = input.imageKey.trim();
    if (input.deliveryFee !== undefined) document.deliveryFee = input.deliveryFee;
    if (input.minOrder !== undefined) document.minOrder = input.minOrder;
    if (input.priceLevel !== undefined) document.priceLevel = input.priceLevel;
    if (input.estimatedDeliveryMinutes !== undefined) {
      document.estimatedDeliveryMinutes = input.estimatedDeliveryMinutes;
    }
    if (input.isOpen !== undefined) document.isOpen = input.isOpen;
    if (input.description !== undefined) document.description = input.description.trim();
    if (input.offerLabel !== undefined) document.offerLabel = input.offerLabel;

    if (input.openingHours !== undefined) {
      document.openingHours = input.openingHours.map((entry) => ({ ...entry }));
    }

    if (input.address !== undefined) {
      this.assertServiceArea(
        input.address.city,
        input.address.latitude,
        input.address.longitude,
      );
      document.address.line1 = input.address.line1;
      if (input.address.line2 !== undefined) document.address.line2 = input.address.line2;
      if (input.address.city !== undefined) document.address.city = input.address.city;
      if (input.address.state !== undefined) document.address.state = input.address.state;
      if (input.address.postalCode !== undefined) {
        document.address.postalCode = input.address.postalCode;
      }
      if (input.address.country !== undefined) document.address.country = input.address.country;
      if (
        input.address.latitude !== undefined &&
        input.address.longitude !== undefined
      ) {
        document.address.coordinates = {
          lat: input.address.latitude,
          lng: input.address.longitude,
        };
      }
    }

    await document.save();
    return toRestaurantResponse(document);
  }

  /**
   * Uploads a restaurant cover or logo. Owners may only touch their own
   * restaurant; administrators may manage any restaurant. The previous asset is
   * deleted only after MongoDB accepted the new URL and public id.
   */
  async updateImage(
    actor: AuthenticatedUser,
    restaurantId: string,
    kind: RestaurantImageKind,
    file: UploadedImageFile | undefined,
  ): Promise<RestaurantResponse> {
    const document = await this.findRestaurantForManagement(actor, restaurantId);
    const stored = await this.uploads.store(file, {
      folder: `restaurants/restaurant-${this.uploads.safeId(document._id.toString())}`,
      name: kind,
    });
    const previous =
      kind === 'cover' ? document.imagePublicId : document.logoPublicId;

    try {
      if (kind === 'cover') {
        document.imageKey = stored.url;
        document.imagePublicId = stored.publicId;
      } else {
        document.logoKey = stored.url;
        document.logoPublicId = stored.publicId;
      }
      await document.save();
    } catch (error) {
      // The database still points at the old image, so remove the new orphan.
      await this.uploads.discard(stored.publicId);
      throw error;
    }

    await this.uploads.discard(previous);
    return toRestaurantResponse(document);
  }

  /** Removes a cover or logo and falls back to the default artwork. */
  async removeImage(
    actor: AuthenticatedUser,
    restaurantId: string,
    kind: RestaurantImageKind,
  ): Promise<RestaurantResponse> {
    const document = await this.findRestaurantForManagement(actor, restaurantId);
    const previous =
      kind === 'cover' ? document.imagePublicId : document.logoPublicId;

    if (kind === 'cover') {
      document.imageKey = 'restaurant-default';
      document.imagePublicId = undefined;
    } else {
      document.logoKey = undefined;
      document.logoPublicId = undefined;
    }
    await document.save();

    await this.uploads.discard(previous);
    return toRestaurantResponse(document);
  }

  async listMenuCategories(idOrSlug: string): Promise<MenuCategoryResponse[]> {
    const restaurant = await this.findApprovedRestaurant(idOrSlug);
    const categories = await this.menuCategoryModel
      .find({ restaurantId: restaurant._id })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    return categories.map(toMenuCategoryResponse);
  }

  async ensureDefaultMenuCategories(restaurantId: string): Promise<void> {
    const existing = await this.menuCategoryModel.countDocuments({ restaurantId });
    if (existing > 0) return;

    await this.menuCategoryModel.insertMany(
      DEFAULT_MENU_CATEGORIES.map((category) => ({
        ...category,
        restaurantId: new Types.ObjectId(restaurantId),
      })),
    );
  }

  async findApprovedRestaurant(idOrSlug: string): Promise<RestaurantDocument> {
    const filter: FilterQuery<RestaurantDocument> = {
      status: RestaurantStatus.APPROVED,
      'address.city': SERVICE_AREA_CITY_FILTER,
    };
    const document = Types.ObjectId.isValid(idOrSlug)
      ? await this.restaurantModel.findOne({ ...filter, _id: idOrSlug }).exec()
      : await this.restaurantModel.findOne({ ...filter, slug: idOrSlug }).exec();

    if (!document) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'That restaurant could not be found.',
      });
    }

    return document;
  }

  async findOwnedRestaurant(
    ownerId: string,
    restaurantId: string,
  ): Promise<RestaurantDocument> {
    const document = Types.ObjectId.isValid(restaurantId)
      ? await this.restaurantModel.findById(restaurantId).exec()
      : null;

    if (!document) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'That restaurant could not be found.',
      });
    }

    if (document.ownerId.toString() !== ownerId) {
      throw new ForbiddenException({
        code: 'restaurant_not_owned',
        message: 'You can only manage restaurants that you own.',
      });
    }

    return document;
  }

  /**
   * Resolves the restaurant an owner is managing. The JWT usually carries the
   * attached restaurant, but older sessions may not, so the owner is used as a
   * safe fallback. This deliberately ignores approval status: owners must be
   * able to complete their profile and menu before review.
   */
  async findOwnedRestaurantForUser(
    ownerId: string,
    restaurantId?: string,
  ): Promise<RestaurantDocument> {
    if (restaurantId) return this.findOwnedRestaurant(ownerId, restaurantId);

    const document = await this.restaurantModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: 1 })
      .exec();

    if (!document) {
      throw new NotFoundException({
        code: 'restaurant_not_found',
        message: 'This account is not linked to a restaurant yet.',
      });
    }

    return document;
  }

  /** Owner profile used by the dashboard; includes pending restaurants. */
  async getOwnedProfile(
    ownerId: string,
    restaurantId?: string,
  ): Promise<RestaurantResponse> {
    const document = await this.findOwnedRestaurantForUser(ownerId, restaurantId);
    return toRestaurantResponse(document);
  }

  /** Owners manage their own restaurant; administrators manage any. */
  async findRestaurantForManagement(
    actor: AuthenticatedUser,
    restaurantId: string,
  ): Promise<RestaurantDocument> {
    if (actor.role === UserRole.ADMIN) {
      const document = Types.ObjectId.isValid(restaurantId)
        ? await this.restaurantModel.findById(restaurantId).exec()
        : null;

      if (!document) {
        throw new NotFoundException({
          code: 'restaurant_not_found',
          message: 'That restaurant could not be found.',
        });
      }
      return document;
    }

    return this.findOwnedRestaurant(actor.id, restaurantId);
  }

  async approvedRestaurantIds(): Promise<Types.ObjectId[]> {
    return this.restaurantModel.distinct('_id', {
      status: RestaurantStatus.APPROVED,
      'address.city': SERVICE_AREA_CITY_FILTER,
    });
  }

  async approvedRestaurantExists(restaurantId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(restaurantId)) return false;
    return Boolean(
      await this.restaurantModel.exists({
        _id: restaurantId,
        status: RestaurantStatus.APPROVED,
        'address.city': SERVICE_AREA_CITY_FILTER,
      }),
    );
  }

  /**
   * Restaurant pins must stay inside the single supported service area.
   * Coordinates and the city are optional for backward compatibility, but any
   * value that is supplied has to be valid.
   */
  private assertServiceArea(
    city: string | undefined,
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    if (city && !SERVICE_AREA_CITY_FILTER.test(city.trim())) {
      throw new BadRequestException({
        code: 'out_of_service_area',
        message: `Savora currently operates in ${SERVICE_AREA_CITY} only.`,
        details: { city: [`Choose ${SERVICE_AREA_CITY}.`] },
      });
    }
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      !isInsideServiceArea({ lat: latitude, lng: longitude })
    ) {
      throw new BadRequestException({
        code: 'out_of_service_area',
        message: 'That map pin is outside the Latakia service area.',
        details: { coordinates: ['Move the pin inside Latakia.'] },
      });
    }
  }

  private async assertCategoriesExist(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;

    const unique = [...new Set(slugs)];
    const count = await this.categoryModel.countDocuments({ slug: { $in: unique } }).exec();

    if (count !== unique.length) {
      throw new BadRequestException({
        code: 'invalid_category',
        message: 'One or more restaurant categories do not exist.',
        details: { categorySlugs: ['Use only categories returned by /restaurant-categories.'] },
      });
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = toSlug(name) || `restaurant-${Date.now()}`;
    let candidate = base;
    let counter = 2;

    while (await this.restaurantModel.exists({ slug: candidate })) {
      candidate = `${base}-${counter}`;
      counter += 1;
      if (counter > 100) {
        candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
        break;
      }
    }

    return candidate;
  }

  private sortFor(sort: RestaurantSort | undefined): Record<string, 1 | -1> {
    switch (sort) {
      case RestaurantSort.RATING:
        return { rating: -1, reviewCount: -1 };
      case RestaurantSort.DELIVERY_TIME:
        return { 'estimatedDeliveryMinutes.0': 1, rating: -1 };
      case RestaurantSort.DELIVERY_FEE:
        return { deliveryFee: 1, rating: -1 };
      case RestaurantSort.RECOMMENDED:
      default:
        return { featured: -1, rating: -1, reviewCount: -1 };
    }
  }
}
