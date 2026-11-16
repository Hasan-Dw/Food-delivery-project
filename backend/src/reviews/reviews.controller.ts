import {
  Body,
  Controller,
  Post,
  Patch,
  Param,
  Delete,
  Get,
  Query,
} from '@nestjs/common';

import { UpdateReviewDto } from './dto/update-review.dto';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { UserRole } from '../common/enums/user.enum';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ReviewsQueryDto } from './dto/reviews-query.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Patch(':reviewId')
  @Roles(UserRole.CUSTOMER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.id, reviewId, dto);
  }

  @Delete(':reviewId')
  @Roles(UserRole.CUSTOMER)
  delete(@CurrentUser() user: AuthenticatedUser, @Param('reviewId') reviewId: string) {
    return this.reviewsService.delete(user.id, reviewId);
  }

  @Get('restaurant/:restaurantId')
  @Public()
  findRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.findRestaurantReviews(restaurantId, query);
  }

  @Get('restaurant/:restaurantId/summary')
  @Public()
  getRestaurantRatingSummary(@Param('restaurantId') restaurantId: string) {
    return this.reviewsService.getRestaurantRatingSummary(restaurantId);
  }

  @Get('menu-item/:menuItemId')
  @Public()
  findMenuItemReviews(
    @Param('menuItemId') menuItemId: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.findMenuItemReviews(menuItemId, query);
  }

  @Get('menu-item/:menuItemId/summary')
  @Public()
  getMenuItemRatingSummary(@Param('menuItemId') menuItemId: string) {
    return this.reviewsService.getMenuItemRatingSummary(menuItemId);
  }

  @Get('driver/:driverId/summary')
  @Public()
  getDriverRatingSummary(@Param('driverId') driverId: string) {
    return this.reviewsService.getDriverRatingSummary(driverId);
  }

  @Get('order/:orderId/delivery')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  getDeliveryReviewForOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.reviewsService.getDeliveryReviewForOrder(orderId, user);
  }

  @Get('my-reviews')
  @Roles(UserRole.CUSTOMER)
  findMyReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.findMyReviews(user.id, query);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  findAllForAdmin(@Query() query: AdminReviewsQueryDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Patch('admin/:reviewId/hide')
  @Roles(UserRole.ADMIN)
  hideReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.hideReview(reviewId, user.id);
  }

  @Patch('admin/:reviewId/restore')
  @Roles(UserRole.ADMIN)
  restoreReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.restoreReview(reviewId, user.id);
  }
}
