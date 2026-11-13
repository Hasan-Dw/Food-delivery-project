import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  MenuCategory,
  MenuCategorySchema,
  Restaurant,
  RestaurantCategory,
  RestaurantCategorySchema,
  RestaurantSchema,
} from './schemas';
import { RestaurantCategoriesController, RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { RestaurantAnalyticsService } from './analytics/restaurant-analytics.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: RestaurantCategory.name, schema: RestaurantCategorySchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    UploadsModule,
  ],
  controllers: [RestaurantsController, RestaurantCategoriesController],
  providers: [RestaurantsService, RestaurantAnalyticsService],
  exports: [RestaurantsService, RestaurantAnalyticsService, MongooseModule],
})
export class RestaurantsModule {}
