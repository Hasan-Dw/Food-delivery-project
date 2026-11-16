import type {
  AdminReviewQuery,
  CreateReviewInput,
  DriverReviewSummary,
  Paginated,
  Review,
  ReviewQuery,
  ReviewSummary,
  ReviewType,
  UpdateReviewInput,
} from '@/types';
import type { ReviewService } from '@/services/reviews/ReviewService';
import { ApiError } from '@/services/api/errors';
import { delay } from '@/mocks/utils/delay';

const EMPTY_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as const;

function emptySummary(): ReviewSummary {
  return { average: 0, total: 0, distribution: { ...EMPTY_DISTRIBUTION } };
}

function summarise(reviews: Review[]): ReviewSummary {
  if (!reviews.length) return emptySummary();
  const distribution = { ...EMPTY_DISTRIBUTION } as Record<1 | 2 | 3 | 4 | 5, number>;
  let sum = 0;
  for (const review of reviews) {
    const bucket = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
    if (bucket >= 1 && bucket <= 5) distribution[bucket] += 1;
    sum += review.rating;
  }
  return {
    average: Math.round((sum / reviews.length) * 100) / 100,
    total: reviews.length,
    distribution,
  };
}

function paginate<T>(items: T[], page = 1, perPage = 12): Paginated<T> {
  const start = (page - 1) * perPage;
  const slice = items.slice(start, start + perPage);
  return {
    items: slice,
    page,
    perPage,
    total: items.length,
    hasMore: start + slice.length < items.length,
  };
}

/** Local stand-in so preview mode renders review surfaces without an API. */
export class MockReviewService implements ReviewService {
  private reviews: Review[] = [];
  private sequence = 0;

  private filter(query: ReviewQuery, type?: ReviewType) {
    return this.reviews.filter(
      (review) =>
        (!type || review.type === type) &&
        (!query.orderId || review.orderId === query.orderId),
    );
  }

  async listForRestaurant(restaurantId: string, query: ReviewQuery = {}): Promise<Paginated<Review>> {
    await delay(180);
    return paginate(
      this.filter(query, 'restaurant').filter((review) => review.restaurantId === restaurantId),
      query.page,
      query.perPage,
    );
  }

  async getRestaurantSummary(restaurantId: string): Promise<ReviewSummary> {
    await delay(140);
    return summarise(this.reviews.filter((review) => review.restaurantId === restaurantId && review.type === 'restaurant'));
  }

  async listForMenuItem(menuItemId: string, query: ReviewQuery = {}): Promise<Paginated<Review>> {
    await delay(180);
    return paginate(
      this.filter(query, 'menu_item').filter((review) => review.menuItemId === menuItemId),
      query.page,
      query.perPage,
    );
  }

  async getMenuItemSummary(menuItemId: string): Promise<ReviewSummary> {
    await delay(140);
    return summarise(this.reviews.filter((review) => review.menuItemId === menuItemId && review.type === 'menu_item'));
  }

  async getDriverSummary(_driverId: string): Promise<DriverReviewSummary> {
    await delay(140);
    const delivery = this.reviews.filter((review) => review.type === 'delivery' && review.status === 'visible');
    const summary = summarise(delivery);
    const averages = (field: 'deliveryRating' | 'serviceRating') => {
      const values = delivery
        .map((review) => review[field])
        .filter((value): value is number => typeof value === 'number');
      if (!values.length) return null;
      return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
    };
    return { ...summary, deliveryAverage: averages('deliveryRating'), serviceAverage: averages('serviceRating') };
  }

  async getDeliveryReview(orderId: string): Promise<Review | null> {
    await delay(140);
    return (
      this.reviews.find(
        (review) => review.orderId === orderId && review.type === 'delivery' && review.status === 'visible',
      ) ?? null
    );
  }

  async listMine(query: ReviewQuery = {}): Promise<Paginated<Review>> {
    await delay(180);
    return paginate(this.filter(query), query.page, query.perPage);
  }

  async create(input: CreateReviewInput): Promise<Review> {
    await delay(260);
    const type = input.type ?? 'restaurant';
    const exists = this.reviews.some(
      (review) =>
        review.orderId === input.orderId &&
        review.type === type &&
        review.menuItemId === (input.menuItemId ?? null),
    );
    if (exists) {
      throw new ApiError({ code: 'review_exists', message: 'This review has already been submitted.' }, 409);
    }
    const rating =
      type === 'delivery'
        ? Math.round((((input.deliveryRating ?? 5) + (input.serviceRating ?? 5)) / 2) * 100) / 100
        : (input.rating ?? 5);
    const review: Review = {
      id: `local-review-${++this.sequence}`,
      type,
      rating,
      deliveryRating: input.deliveryRating ?? null,
      serviceRating: input.serviceRating ?? null,
      comment: input.comment?.trim() ?? '',
      status: 'visible',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restaurantId: '',
      restaurantName: '',
      restaurantImageKey: '',
      menuItemId: input.menuItemId ?? null,
      menuItemName: '',
      menuItemImageKey: '',
      orderId: input.orderId,
      orderCode: '',
      customer: { id: 'local', name: 'You', avatarKey: '' },
    };
    this.reviews = [review, ...this.reviews];
    return review;
  }

  async update(reviewId: string, input: UpdateReviewInput): Promise<Review> {
    await delay(220);
    const review = this.reviews.find((entry) => entry.id === reviewId);
    if (!review) throw new ApiError({ code: 'review_not_found', message: 'Review not found.' }, 404);
    if (input.rating !== undefined) review.rating = input.rating;
    if (input.deliveryRating !== undefined) review.deliveryRating = input.deliveryRating;
    if (input.serviceRating !== undefined) review.serviceRating = input.serviceRating;
    if (input.comment !== undefined) review.comment = input.comment.trim();
    if (review.type === 'delivery') {
      review.rating =
        Math.round((((review.deliveryRating ?? 0) + (review.serviceRating ?? 0)) / 2) * 100) / 100;
    }
    review.updatedAt = new Date().toISOString();
    return { ...review };
  }

  async remove(reviewId: string): Promise<void> {
    await delay(200);
    this.reviews = this.reviews.filter((review) => review.id !== reviewId);
  }

  async listForAdmin(query: AdminReviewQuery = {}): Promise<Paginated<Review>> {
    await delay(200);
    return paginate(
      this.reviews.filter(
        (review) =>
          (!query.status || review.status === query.status) &&
          (!query.type || review.type === query.type),
      ),
      query.page,
      query.perPage,
    );
  }

  async hide(reviewId: string): Promise<Review> {
    const review = await this.update(reviewId, {});
    review.status = 'hidden';
    return review;
  }

  async restore(reviewId: string): Promise<Review> {
    const review = await this.update(reviewId, {});
    review.status = 'visible';
    return review;
  }
}
