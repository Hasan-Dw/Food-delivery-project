import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { paginate, type PaginatedResult } from '../common/dto/pagination-query.dto';
import { RestaurantStatus } from '../common/enums/user.enum';
import { toSlug } from '../common/utils/slug.util';
import type {
  MenuCategoryResponse,
  RestaurantCategoryResponse,
  RestaurantResponse,
} from './interfaces/restaurant-response.interface';
import { RestaurantSort, type RestaurantQueryDto } from './dto/restaurant-query.dto';
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
  ) {}

  async list(query: RestaurantQueryDto): Promise<PaginatedResult<RestaurantResponse>> {
    const filter: FilterQuery<RestaurantDocument> = {
      status: RestaurantStatus.APPROVED,
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
          categorySlugs: category.slug,
        });
        return toRestaurantCategoryResponse(category, itemCount);
      }),
    );
  }

  async getFeatured(limit = 8): Promise<RestaurantResponse[]> {
    const documents = await this.restaurantModel
      .find({ status: RestaurantStatus.APPROVED, featured: true })
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
        city: input.address.city ?? '',
        state: input.address.state ?? '',
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
      description: input.description,
      offerLabel: input.offerLabel,
      status,
    });

    await this.ensureDefaultMenuCategories(document._id.toString());
    return toRestaurantResponse(document);
  }

  async update(
    ownerId: string,
    restaurantId: string,
    input: UpdateRestaurantInput,
  ): Promise<RestaurantResponse> {
    const document = await this.findOwnedRestaurant(ownerId, restaurantId);

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
    if (input.description !== undefined) document.description = input.description;
    if (input.offerLabel !== undefined) document.offerLabel = input.offerLabel;

    if (input.openingHours !== undefined) {
      document.openingHours = input.openingHours.map((entry) => ({ ...entry }));
    }

    if (input.address !== undefined) {
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

  async approvedRestaurantIds(): Promise<Types.ObjectId[]> {
    return this.restaurantModel.distinct('_id', { status: RestaurantStatus.APPROVED });
  }

  async approvedRestaurantExists(restaurantId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(restaurantId)) return false;
    return Boolean(
      await this.restaurantModel.exists({
        _id: restaurantId,
        status: RestaurantStatus.APPROVED,
      }),
    );
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
