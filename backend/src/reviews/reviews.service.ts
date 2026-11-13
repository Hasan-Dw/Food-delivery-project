import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Review , ReviewStatus,ReviewModerationAction} from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '../common/enums/order.enum';
import { MongoServerError } from 'mongodb';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { ReviewsQueryDto } from './dto/reviews-query.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';
@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

     @InjectModel(Restaurant.name)
private readonly restaurantModel: Model<Restaurant>,

  ) {}
 
  async create(customerId: string, dto: CreateReviewDto) {
    const order = await this.orderModel.findById(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId.toString() !== customerId) {
      throw new ForbiddenException(
        'You can only review your own orders',
      );
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'You can only review completed orders',
      );
    }

    const existingReview = await this.reviewModel.findOne({
      orderId: new Types.ObjectId(dto.orderId),
    });

    if (existingReview) {
      throw new ConflictException(
        'This order has already been reviewed',
      );
    }

    try {
      const review = new this.reviewModel({
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        orderId: order._id,
        rating: dto.rating,
      });

const savedReview = await review.save();

await this.refreshRestaurantRating(
  savedReview.restaurantId,
);

return savedReview;      
   } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'This order has already been reviewed',
        );
      }

      throw error;
    }
  }
  async update( customerId: string, reviewId: string, dto: UpdateReviewDto) {
  if (dto.rating === undefined) {
    throw new BadRequestException(
      'Rating is required',
    );
  }

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

  review.rating = dto.rating;

const updatedReview = await review.save();

await this.refreshRestaurantRating(
  updatedReview.restaurantId,
);
return updatedReview;
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

const restaurantId = review.restaurantId;

await review.deleteOne();

await this.refreshRestaurantRating(restaurantId);
  return {
    message: 'Review deleted successfully',
  };
}
async findRestaurantReviews(restaurantId: string, query: ReviewsQueryDto,) {
  if (!Types.ObjectId.isValid(restaurantId)) {
    throw new BadRequestException('Invalid restaurant ID');
  }

  const restaurant = await this.restaurantModel.findById(restaurantId);

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  const page = query.page || 1;
  const perPage = query.perPage || 12;
  const skip = (page - 1) * perPage;

  const filter = {
    restaurantId: new Types.ObjectId(restaurantId),
    status: 'visible',
  };

  const [reviews, total] = await Promise.all([
    this.reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),

    this.reviewModel.countDocuments(filter),
  ]);

  return {
    data: reviews,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
private async refreshRestaurantRating(restaurantId: Types.ObjectId) {
  const distribution = await this.reviewModel.aggregate([
    {
      $match: {
        restaurantId,
        status: 'visible',
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = distribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const weightedSum = distribution.reduce(
    (sum, item) => sum + item._id * item.count,
    0,
  );

  const average =
    total > 0
      ? Math.round((weightedSum / total) * 100) / 100
      : 0;

  await this.restaurantModel.updateOne(
    { _id: restaurantId },
    {
      $set: {
        rating: average,
        reviewCount: total,
      },
    },
  );

  return {
    average,
    total,
    distribution: {
      1: distribution.find((item) => item._id === 1)?.count || 0,
      2: distribution.find((item) => item._id === 2)?.count || 0,
      3: distribution.find((item) => item._id === 3)?.count || 0,
      4: distribution.find((item) => item._id === 4)?.count || 0,
      5: distribution.find((item) => item._id === 5)?.count || 0,
    },
  };
}
async getRestaurantRatingSummary(restaurantId: string) {
  if (!Types.ObjectId.isValid(restaurantId)) {
    throw new BadRequestException('Invalid restaurant ID');
  }

  const restaurant = await this.restaurantModel.findById(restaurantId);

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  const distribution = await this.reviewModel.aggregate([
    {
      $match: {
        restaurantId: new Types.ObjectId(restaurantId),
        status: 'visible',
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = distribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const weightedSum = distribution.reduce(
    (sum, item) => sum + item._id * item.count,
    0,
  );

  return {
    average:
      total > 0
        ? Math.round((weightedSum / total) * 100) / 100
        : 0,
    total,
    distribution: {
      1: distribution.find((item) => item._id === 1)?.count || 0,
      2: distribution.find((item) => item._id === 2)?.count || 0,
      3: distribution.find((item) => item._id === 3)?.count || 0,
      4: distribution.find((item) => item._id === 4)?.count || 0,
      5: distribution.find((item) => item._id === 5)?.count || 0,
    },
  };
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

  await this.refreshRestaurantRating(review.restaurantId);

  return {
    message: 'Review hidden successfully',
    review,
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

  await this.refreshRestaurantRating(review.restaurantId);

  return {
    message: 'Review restored successfully',
    review,
  };
}
async findMyReviews(
  customerId: string,
  query: ReviewsQueryDto,
) {
  const page = query.page || 1;
  const perPage = query.perPage || 12;
  const skip = (page - 1) * perPage;

  const filter = {
    customerId: new Types.ObjectId(customerId),
  };

  const [reviews, total] = await Promise.all([
    this.reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),

    this.reviewModel.countDocuments(filter),
  ]);

  return {
    data: reviews,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
async findAllForAdmin(query: AdminReviewsQueryDto) {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 12;

  const filter: any = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [reviews, total] = await Promise.all([
    this.reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('customerId', 'name email')
      .populate('restaurantId', 'name')
      .populate('orderId', 'status')
      .lean(),

    this.reviewModel.countDocuments(filter),
  ]);

  return {
    data: reviews,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
}
