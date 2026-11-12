import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Delivery, DeliverySchema } from '../deliveries/schemas/delivery.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import {
  DriverProfile,
  DriverProfileSchema,
} from '../users/schemas/driver-profile.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: DriverProfile.name, schema: DriverProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
