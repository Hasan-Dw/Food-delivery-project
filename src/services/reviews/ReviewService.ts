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

/**
 * Ratings and reviews are split by dimension: restaurant, individual dish and
 * the delivery/service experience. Summaries are public read models; writing
 * requires the customer's own delivered order.
 */
export interface ReviewService {
  listForRestaurant(restaurantId: string, query?: ReviewQuery): Promise<Paginated<Review>>;
  getRestaurantSummary(restaurantId: string): Promise<ReviewSummary>;
  listForMenuItem(menuItemId: string, query?: ReviewQuery): Promise<Paginated<Review>>;
  getMenuItemSummary(menuItemId: string): Promise<ReviewSummary>;
  getDriverSummary(driverId: string): Promise<DriverReviewSummary>;
  /** The signed-in customer's delivery review for one order, if any. */
  getDeliveryReview(orderId: string): Promise<Review | null>;
  listMine(query?: ReviewQuery): Promise<Paginated<Review>>;
  create(input: CreateReviewInput): Promise<Review>;
  update(reviewId: string, input: UpdateReviewInput): Promise<Review>;
  remove(reviewId: string): Promise<void>;
  /** Admin moderation queue. */
  listForAdmin(query?: AdminReviewQuery): Promise<Paginated<Review>>;
  hide(reviewId: string): Promise<Review>;
  restore(reviewId: string): Promise<Review>;
}
