import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckoutModule } from '../checkout/checkout.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { Delivery, DeliverySchema } from '../deliveries/schemas/delivery.schema';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Delivery.name, schema: DeliverySchema },
    ]),
    CheckoutModule,
    DeliveriesModule,
    PromotionsModule,
    UsersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
