import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Delivery, DeliverySchema } from '../deliveries/schemas/delivery.schema';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { DriversModule } from '../drivers/drivers.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import {
  DriverProfile,
  DriverProfileSchema,
} from '../users/schemas/driver-profile.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DriverProfile.name, schema: DriverProfileSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Delivery.name, schema: DeliverySchema },
    ]),
    DriversModule,
    DeliveriesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsService],
})
export class AdminModule {}
