import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { PromotionsModule } from '../promotions/promotions.module';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { CheckoutController } from './checkout.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    PromotionsModule,
  ],
  controllers: [CheckoutController],
  providers: [PricingService],
  exports: [PricingService],
})
export class CheckoutModule {}
