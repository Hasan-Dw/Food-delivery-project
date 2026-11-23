import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { PromotionsController } from './promotions.controller';
import { RestaurantPromotionsController } from './restaurant-promotions.controller';
import { PromotionsService } from './promotions.service';
import {
  Promotion,
  PromotionCustomerUsage,
  PromotionCustomerUsageSchema,
  PromotionRedemption,
  PromotionRedemptionSchema,
  PromotionSchema,
} from './schemas/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PromotionRedemption.name, schema: PromotionRedemptionSchema },
      { name: PromotionCustomerUsage.name, schema: PromotionCustomerUsageSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [PromotionsController, RestaurantPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
