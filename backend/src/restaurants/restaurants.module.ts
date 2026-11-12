import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: RestaurantCategory.name, schema: RestaurantCategorySchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
    ]),
  ],
  controllers: [RestaurantsController, RestaurantCategoriesController],
  providers: [RestaurantsService],
  exports: [RestaurantsService, MongooseModule],
})
export class RestaurantsModule {}
