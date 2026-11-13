import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Delivery, DeliverySchema } from '../deliveries/schemas/delivery.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { RoutingModule } from '../routing/routing.module';
import {
  DriverProfile,
  DriverProfileSchema,
} from '../users/schemas/driver-profile.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
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
    RoutingModule,
    AuthModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
