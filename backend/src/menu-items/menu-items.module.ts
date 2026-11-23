import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import {
  MenuCategoriesController,
  MenuItemsController,
  RestaurantMenuItemsController,
} from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MenuItem.name, schema: MenuItemSchema }]),
    RestaurantsModule,
    UploadsModule,
  ],
  controllers: [MenuItemsController, RestaurantMenuItemsController, MenuCategoriesController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
