import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { MongoServerError } from 'mongodb';

import {
  Review,
  ReviewModerationAction,
  ReviewStatus,
  ReviewType,
} from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../common/enums/order.enum';
import { UserRole } from '../common/enums/user.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Delivery } from '../deliveries/schemas/delivery.schema';
import { DriverProfile } from '../users/schemas/driver-profile.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsQueryDto } from './dto/reviews-query.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';

export interface RatingDistribution {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface PopulatedCustomer {
  _id?: Types.ObjectId;
  fullName?: string;
  name?: string;
  avatarKey?: string;
}

type LeanReview = Record<string, unknown> & {
  _id: Types.ObjectId;
  customerId?: PopulatedCustomer | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

const EMPTY_DISTRIBUTION: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<Restaurant>,

    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItem>,

    @InjectModel(Delivery.name)
    private readonly deliveryModel: Model<Delivery>,

    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfile>,
  ) {}

  async create(customerId: string, dto: CreateReviewDto) {
    const order = await this.orderModel.findById(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId.toString() !== customerId) {
      throw new ForbiddenException('You can only review your own orders');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review an order after it has been delivered',
      );
    }

    const type = dto.type ?? ReviewType.RESTAURANT;
    let menuItemId: Types.ObjectId | null = null;
    let driverId: Types.ObjectId | null = null;
    let rating: number;
    let deliveryRating: number | null = null;
    let serviceRating: number | null = null;

    if (type === ReviewType.RESTAURANT) {
      rating = this.requireRating(dto.rating, 'A restaurant rating is required');
    } else if (type === ReviewType.MENU_ITEM) {
      if (!dto.menuItemId || !Types.ObjectId.isValid(dto.menuItemId)) {
        throw new BadRequestException('A valid menu item id is required');
      }

      menuItemId = new Types.ObjectId(dto.menuItemId);
      const purchased = order.items.some((item) =>
        item.productId.equals(menuItemId as Types.ObjectId),
      );

      if (!purchased) {
        throw new BadRequestException(
          'You can only review food you purchased in this order',
        );
      }

      const menuItem = await this.menuItemModel.findOne({
        _id: menuItemId,
        restaurantId: order.restaurantId,
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found for this order');
      }

      rating = this.requireRating(dto.rating, 'A food rating is required');
    } else {
      deliveryRating = this.requireRating(
        dto.deliveryRating,
        'A delivery experience rating is required',
      );
      serviceRating = this.requireRating(
        dto.serviceRating,
        'A service quality rating is required',
      );
      rating = Math.round(((deliveryRating + serviceRating) / 2) * 100) / 100;
      const delivery = await this.deliveryModel.findOne({ orderId: order._id });
      driverId = delivery?.driverId ?? null;
    }

    const existingReview = await this.reviewModel.findOne({
      orderId: order._id,
      type,
      menuItemId,
    });

    if (existingReview) {
      throw new ConflictException({
        code: 'review_exists',
        message:
          type === ReviewType.MENU_ITEM
            ? 'You have already reviewed this dish for this order'
            : type === ReviewType.DELIVERY
              ? 'You have already reviewed the delivery for this order'
              : 'This order has already been reviewed',
      });
    }

    try {
      const review = new this.reviewModel({
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        orderId: order._id,
        type,
        menuItemId,
        driverId,
        rating,
        deliveryRating,
        serviceRating,
        comment: dto.comment?.trim() ?? '',
      });

      const savedReview = await review.save();
      await this.refreshAllForReview(savedReview);

      return this.toResponse(await this.findPopulatedReview(savedReview._id));
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException({
          code: 'review_exists',
          message: 'This review has already been submitted',
        });
      }

      throw error;
    }
  }

  async update(customerId: string, reviewId: string, dto: UpdateReviewDto) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const hasChanges =
      dto.rating !== undefined ||
      dto.comment !== undefined ||
      dto.deliveryRating !== undefined ||
      dto.serviceRating !== undefined;

    if (!hasChanges) {
      throw new BadRequestException('Provide a rating or comment to update');
    }

    const review = await this.reviewModel.findOne({
      _id: reviewId,
      customerId: new Types.ObjectId(customerId),
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.type === ReviewType.DELIVERY) {
      if (dto.deliveryRating !== undefined) review.deliveryRating = dto.deliveryRating;
      if (dto.serviceRating !== undefined) review.serviceRating = dto.serviceRating;

      if (review.deliveryRating == null || review.serviceRating == null) {
        throw new BadRequestException(
          'Delivery and service ratings are both required',
        );
      }

      review.rating =
        Math.round(
          ((review.deliveryRating + review.serviceRating) / 2) * 100,
        ) / 100;
    } else if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }

    if (dto.comment !== undefined) review.comment = dto.comment.trim();

    const updatedReview = await review.save();
    await this.refreshAllForReview(updatedReview);

    return this.toResponse(await this.findPopulatedReview(updatedReview._id));
  }

  async delete(customerId: string, reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findOne({
      _id: reviewId,
      customerId: new Types.ObjectId(customerId),
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const target = {
      restaurantId: review.restaurantId,
      menuItemId: review.menuItemId,
      driverId: review.driverId,
    };

    await review.deleteOne();
    await this.refreshTargets(target);

    return {
      message: 'Review deleted successfully',
    };
  }

  async findRestaurantReviews(restaurantId: string, query: ReviewsQueryDto) {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID');
    }

    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.findMany(
      {
        restaurantId: new Types.ObjectId(restaurantId),
        type: ReviewType.RESTAURANT,
        status: ReviewStatus.VISIBLE,
      },
      query,
    );
  }

  async findMenuItemReviews(menuItemId: string, query: ReviewsQueryDto) {
    if (!Types.ObjectId.isValid(menuItemId)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    return this.findMany(
      {
        menuItemId: new Types.ObjectId(menuItemId),
        type: ReviewType.MENU_ITEM,
        status: ReviewStatus.VISIBLE,
      },
      query,
    );
  }

  async getRestaurantRatingSummary(restaurantId: string) {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID');
    }

    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.ratingSummary({
      restaurantId: new Types.ObjectId(restaurantId),
      type: ReviewType.RESTAURANT,
      status: ReviewStatus.VISIBLE,
    });
  }

  async getMenuItemRatingSummary(menuItemId: string) {
    if (!Types.ObjectId.isValid(menuItemId)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    return this.ratingSummary({
      menuItemId: new Types.ObjectId(menuItemId),
      type: ReviewType.MENU_ITEM,
      status: ReviewStatus.VISIBLE,
    });
  }

  async getDriverRatingSummary(driverId: string) {
    if (!Types.ObjectId.isValid(driverId)) {
      throw new BadRequestException('Invalid driver ID');
    }

    const summary = await this.ratingSummary({
      driverId: new Types.ObjectId(driverId),
      type: ReviewType.DELIVERY,
      status: ReviewStatus.VISIBLE,
    });

    const [delivery, service] = await Promise.all([
      this.averageFor('deliveryRating', {
        driverId: new Types.ObjectId(driverId),
        type: ReviewType.DELIVERY,
        status: ReviewStatus.VISIBLE,
      }),
      this.averageFor('serviceRating', {
        driverId: new Types.ObjectId(driverId),
        type: ReviewType.DELIVERY,
        status: ReviewStatus.VISIBLE,
      }),
    ]);

    return {
      ...summary,
      deliveryAverage: delivery,
      serviceAverage: service,
    };
  }

  async getDeliveryReviewForOrder(orderId: string, actor: AuthenticatedUser) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role !== UserRole.ADMIN && order.customerId.toString() !== actor.id) {
      throw new ForbiddenException('You can only view reviews for your own orders');
    }

    const review = await this.reviewModel.findOne({
      orderId: new Types.ObjectId(orderId),
      type: ReviewType.DELIVERY,
      status: ReviewStatus.VISIBLE,
    });

    return review ? this.toResponse(await this.findPopulatedReview(review._id)) : null;
  }

  async hideReview(reviewId: string, adminId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status === ReviewStatus.HIDDEN) {
      throw new BadRequestException('Review is already hidden');
    }

    review.status = ReviewStatus.HIDDEN;
    review.moderationHistory.push({
      actorId: new Types.ObjectId(adminId),
      action: ReviewModerationAction.HIDE,
      createdAt: new Date(),
    });

    await review.save();
    await this.refreshAllForReview(review);

    return {
      message: 'Review hidden successfully',
      review: this.toResponse(await this.findPopulatedReview(review._id)),
    };
  }

  async restoreReview(reviewId: string, adminId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status === ReviewStatus.VISIBLE) {
      throw new BadRequestException('Review is already visible');
    }

    review.status = ReviewStatus.VISIBLE;
    review.moderationHistory.push({
      actorId: new Types.ObjectId(adminId),
      action: ReviewModerationAction.RESTORE,
      createdAt: new Date(),
    });

    await review.save();
    await this.refreshAllForReview(review);

    return {
      message: 'Review restored successfully',
      review: this.toResponse(await this.findPopulatedReview(review._id)),
    };
  }

  async findMyReviews(customerId: string, query: ReviewsQueryDto) {
    const filter: FilterQuery<Review> = {
      customerId: new Types.ObjectId(customerId),
    };

    if (query.orderId && Types.ObjectId.isValid(query.orderId)) {
      filter.orderId = new Types.ObjectId(query.orderId);
    }

    if (query.type) filter.type = query.type;

    return this.findMany(filter, query);
  }

  async findAllForAdmin(query: AdminReviewsQueryDto) {
    const filter: FilterQuery<Review> = {};

    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.restaurantId) {
      filter.restaurantId = new Types.ObjectId(query.restaurantId);
    }

    return this.findMany(filter, query, true);
  }

  private async findMany(
    filter: FilterQuery<Review>,
    query: ReviewsQueryDto,
    includeHidden = false,
  ) {
    const page = query.page || 1;
    const perPage = query.perPage || 12;
    const skip = (page - 1) * perPage;

    if (!includeHidden && !filter.status) {
      filter.status = ReviewStatus.VISIBLE;
    }

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate('customerId', 'fullName avatarKey')
        .populate('restaurantId', 'name imageKey slug')
        .populate('menuItemId', 'name imageKey')
        .populate('orderId', 'code status')
        .lean<LeanReview[]>(),
      this.reviewModel.countDocuments(filter),
    ]);

    return {
      items: reviews.map((review) => this.toResponse(review)),
      page,
      perPage,
      total,
      hasMore: page * perPage < total,
    };
  }

  private async findPopulatedReview(reviewId: Types.ObjectId): Promise<LeanReview> {
    const review = await this.reviewModel
      .findById(reviewId)
      .populate('customerId', 'fullName avatarKey')
      .populate('restaurantId', 'name imageKey slug')
      .populate('menuItemId', 'name imageKey')
      .populate('orderId', 'code status')
      .lean<LeanReview | null>();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private toResponse(review: LeanReview) {
    const customer = review.customerId as PopulatedCustomer | Types.ObjectId | undefined;
    const customerObject =
      customer && !(customer instanceof Types.ObjectId)
        ? (customer as PopulatedCustomer)
        : null;
    const restaurant = review.restaurantId as
      | { _id?: Types.ObjectId; name?: string; imageKey?: string; slug?: string }
      | Types.ObjectId
      | undefined;
    const menuItem = review.menuItemId as
      | { _id?: Types.ObjectId; name?: string; imageKey?: string }
      | Types.ObjectId
      | null
      | undefined;
    const order = review.orderId as
      | { _id?: Types.ObjectId; code?: string; status?: string }
      | Types.ObjectId
      | undefined;

    return {
      id: String(review._id),
      type: review.type,
      rating: review.rating,
      deliveryRating: review.deliveryRating ?? null,
      serviceRating: review.serviceRating ?? null,
      comment: review.comment ?? '',
      status: review.status,
      createdAt: review.createdAt ?? null,
      updatedAt: review.updatedAt ?? null,
      restaurantId:
        restaurant && !(restaurant instanceof Types.ObjectId)
          ? String(restaurant._id ?? '')
          : String(review.restaurantId ?? ''),
      restaurantName:
        restaurant && !(restaurant instanceof Types.ObjectId) ? (restaurant.name ?? '') : '',
      restaurantImageKey:
        restaurant && !(restaurant instanceof Types.ObjectId)
          ? (restaurant.imageKey ?? '')
          : '',
      menuItemId:
        menuItem && !(menuItem instanceof Types.ObjectId)
          ? String(menuItem._id ?? '')
          : menuItem
            ? String(menuItem)
            : null,
      menuItemName:
        menuItem && !(menuItem instanceof Types.ObjectId) ? (menuItem.name ?? '') : '',
      menuItemImageKey:
        menuItem && !(menuItem instanceof Types.ObjectId) ? (menuItem.imageKey ?? '') : '',
      orderId:
        order && !(order instanceof Types.ObjectId)
          ? String(order._id ?? '')
          : String(review.orderId ?? ''),
      orderCode:
        order && !(order instanceof Types.ObjectId) ? (order.code ?? '') : '',
      customer: customerObject
        ? {
            id: String(customerObject._id ?? ''),
            name: customerObject.fullName ?? customerObject.name ?? 'Savora customer',
            avatarKey: customerObject.avatarKey ?? '',
          }
        : {
            id: String(customer ?? ''),
            name: 'Savora customer',
            avatarKey: '',
          },
    };
  }

  private requireRating(value: number | undefined, message: string): number {
    if (value === undefined || value === null) {
      throw new BadRequestException(message);
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new BadRequestException('Ratings must be whole numbers from 1 to 5');
    }
    return value;
  }

  private async refreshAllForReview(review: {
    restaurantId: Types.ObjectId;
    menuItemId?: Types.ObjectId | null;
    driverId?: Types.ObjectId | null;
  }): Promise<void> {
    await this.refreshTargets({
      restaurantId: review.restaurantId,
      menuItemId: review.menuItemId ?? null,
      driverId: review.driverId ?? null,
    });
  }

  private async refreshTargets(target: {
    restaurantId: Types.ObjectId;
    menuItemId?: Types.ObjectId | null;
    driverId?: Types.ObjectId | null;
  }): Promise<void> {
    const tasks: Promise<unknown>[] = [this.refreshRestaurantRating(target.restaurantId)];

    if (target.menuItemId) tasks.push(this.refreshMenuItemRating(target.menuItemId));
    if (target.driverId) tasks.push(this.refreshDriverRating(target.driverId));

    await Promise.all(tasks);
  }

  private async refreshRestaurantRating(restaurantId: Types.ObjectId) {
    const summary = await this.ratingSummary({
      restaurantId,
      type: ReviewType.RESTAURANT,
      status: ReviewStatus.VISIBLE,
    });

    await this.restaurantModel.updateOne(
      { _id: restaurantId },
      {
        $set: {
          rating: summary.average,
          reviewCount: summary.total,
        },
      },
    );

    return summary;
  }

  private async refreshMenuItemRating(menuItemId: Types.ObjectId) {
    const summary = await this.ratingSummary({
      menuItemId,
      type: ReviewType.MENU_ITEM,
      status: ReviewStatus.VISIBLE,
    });

    await this.menuItemModel.updateOne(
      { _id: menuItemId },
      {
        $set: {
          rating: summary.average,
          reviewCount: summary.total,
        },
      },
    );

    return summary;
  }

  private async refreshDriverRating(driverId: Types.ObjectId) {
    const average = await this.averageFor('deliveryRating', {
      driverId,
      type: ReviewType.DELIVERY,
      status: ReviewStatus.VISIBLE,
    });

    await this.driverModel.updateOne(
      { _id: driverId },
      { $set: { rating: average ?? 5 } },
    );
  }

  private async ratingSummary(filter: FilterQuery<Review>): Promise<RatingDistribution> {
    const distribution = await this.reviewModel.aggregate<{ _id: number; count: number }>([
      { $match: filter },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    const weightedSum = distribution.reduce(
      (sum, item) => sum + item._id * item.count,
      0,
    );
    const buckets = { ...EMPTY_DISTRIBUTION };

    for (const item of distribution) {
      if (item._id >= 1 && item._id <= 5) {
        buckets[item._id as 1 | 2 | 3 | 4 | 5] = item.count;
      }
    }

    return {
      average: total > 0 ? Math.round((weightedSum / total) * 100) / 100 : 0,
      total,
      distribution: buckets,
    };
  }

  private async averageFor(
    field: 'deliveryRating' | 'serviceRating',
    filter: FilterQuery<Review>,
  ): Promise<number | null> {
    const [result] = await this.reviewModel.aggregate<{ average: number | null }>([
      { $match: { ...filter, [field]: { $ne: null } } },
      { $group: { _id: null, average: { $avg: `$${field}` } } },
    ]);

    if (!result?.average) return null;
    return Math.round(result.average * 100) / 100;
  }
}
