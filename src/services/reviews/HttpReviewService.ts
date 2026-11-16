import type {
  AdminReviewQuery,
  CreateReviewInput,
  DriverReviewSummary,
  Paginated,
  Review,
  ReviewQuery,
  ReviewSummary,
  UpdateReviewInput,
} from '@/types';
import type { ApiClient } from '@/services/api/client';
import type { ReviewService } from './ReviewService';

function queryParams(query: ReviewQuery | AdminReviewQuery = {}) {
  return {
    page: query.page,
    perPage: query.perPage,
    orderId: query.orderId,
    type: query.type,
    status: 'status' in query ? query.status : undefined,
    restaurantId: 'restaurantId' in query ? query.restaurantId : undefined,
  };
}

export class HttpReviewService implements ReviewService {
  constructor(private readonly client: ApiClient) {}

  async listForRestaurant(
    restaurantId: string,
    query: ReviewQuery = {},
  ): Promise<Paginated<Review>> {
    const response = await this.client.get<Paginated<Review>>(
      `/reviews/restaurant/${encodeURIComponent(restaurantId)}`,
      { query: queryParams(query), auth: false },
    );
    return response.data;
  }

  async getRestaurantSummary(restaurantId: string): Promise<ReviewSummary> {
    const response = await this.client.get<ReviewSummary>(
      `/reviews/restaurant/${encodeURIComponent(restaurantId)}/summary`,
      { auth: false },
    );
    return response.data;
  }

  async listForMenuItem(
    menuItemId: string,
    query: ReviewQuery = {},
  ): Promise<Paginated<Review>> {
    const response = await this.client.get<Paginated<Review>>(
      `/reviews/menu-item/${encodeURIComponent(menuItemId)}`,
      { query: queryParams(query), auth: false },
    );
    return response.data;
  }

  async getMenuItemSummary(menuItemId: string): Promise<ReviewSummary> {
    const response = await this.client.get<ReviewSummary>(
      `/reviews/menu-item/${encodeURIComponent(menuItemId)}/summary`,
      { auth: false },
    );
    return response.data;
  }

  async getDriverSummary(driverId: string): Promise<DriverReviewSummary> {
    const response = await this.client.get<DriverReviewSummary>(
      `/reviews/driver/${encodeURIComponent(driverId)}/summary`,
      { auth: false },
    );
    return response.data;
  }

  async getDeliveryReview(orderId: string): Promise<Review | null> {
    const response = await this.client.get<Review | null>(
      `/reviews/order/${encodeURIComponent(orderId)}/delivery`,
    );
    return response.data ?? null;
  }

  async listMine(query: ReviewQuery = {}): Promise<Paginated<Review>> {
    const response = await this.client.get<Paginated<Review>>('/reviews/my-reviews', {
      query: queryParams(query),
    });
    return response.data;
  }

  async create(input: CreateReviewInput): Promise<Review> {
    const response = await this.client.post<Review>('/reviews', input);
    return response.data;
  }

  async update(reviewId: string, input: UpdateReviewInput): Promise<Review> {
    const response = await this.client.patch<Review>(
      `/reviews/${encodeURIComponent(reviewId)}`,
      input,
    );
    return response.data;
  }

  async remove(reviewId: string): Promise<void> {
    await this.client.delete(`/reviews/${encodeURIComponent(reviewId)}`);
  }

  async listForAdmin(query: AdminReviewQuery = {}): Promise<Paginated<Review>> {
    const response = await this.client.get<Paginated<Review>>('/reviews/admin', {
      query: queryParams(query),
    });
    return response.data;
  }

  async hide(reviewId: string): Promise<Review> {
    const response = await this.client.patch<{ review: Review }>(
      `/reviews/admin/${encodeURIComponent(reviewId)}/hide`,
    );
    return response.data.review;
  }

  async restore(reviewId: string): Promise<Review> {
    const response = await this.client.patch<{ review: Review }>(
      `/reviews/admin/${encodeURIComponent(reviewId)}/restore`,
    );
    return response.data.review;
  }
}
